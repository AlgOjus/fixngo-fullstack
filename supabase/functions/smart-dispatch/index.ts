import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI } from "npm:@google/genai";
import { Buffer } from "node:buffer";

// Serve the function on standard requests
serve(async (req) => {
  // 1. Handle CORS Preflight Options
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // 2. Read environment credentials
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!geminiApiKey) {
      throw new Error("Missing GEMINI_API_KEY environment variable.");
    }
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).");
    }

    // 3. Parse Database Webhook Payload
    const payload = await req.json();
    console.log("Smart Dispatch Triggered. Payload received:", JSON.stringify(payload));

    const record = payload.record;
    if (!record) {
      return new Response(JSON.stringify({ error: "Invalid webhook payload: missing 'record' block." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id, description, before_image_url, category, custom_category_note } = record;
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing row identifier 'id' in record." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Initialize clients
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    console.log(`Processing Ticket ID: ${id}. Initializing Intelligent De-duplication pipeline...`);

    // --- SPATIAL PROXIMITY CHECK ---
    let nearbyIssues: any[] = [];
    try {
      console.log(`Performing Spatial Proximity Check for coordinates: ${record.lat}, ${record.lng}`);
      // Attempt PostGIS ST_DWithin query via RPC
      const { data, error } = await supabase.rpc("check_spatial_proximity", {
        new_lat: parseFloat(record.lat),
        new_lng: parseFloat(record.lng),
        radius_meters: 20
      });

      if (!error && data) {
        nearbyIssues = data.filter((item: any) => item.id !== id && (item.status === "Pending" || item.status === "In Progress"));
        console.log(`RPC Spatial Check completed. Found ${nearbyIssues.length} active nearby issue(s).`);
      } else {
        console.warn("RPC check_spatial_proximity unavailable or errored. Using client-side Haversine fallback:", error?.message);
        
        // Fetch existing Pending or In Progress issues
        const { data: activeIssues, error: fetchError } = await supabase
          .from("issues")
          .select("*")
          .in("status", ["Pending", "In Progress"])
          .neq("id", id);

        if (!fetchError && activeIssues) {
          const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
            const R = 6371e3; // Earth radius in meters
            const phi1 = lat1 * Math.PI / 180;
            const phi2 = lat2 * Math.PI / 180;
            const deltaPhi = (lat2 - lat1) * Math.PI / 180;
            const deltaLambda = (lon2 - lon1) * Math.PI / 180;

            const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                      Math.cos(phi1) * Math.cos(phi2) *
                      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            return R * c; // in meters
          };

          nearbyIssues = activeIssues.filter((issue: any) => {
            const issueLat = Number(issue.lat);
            const issueLng = Number(issue.lng);
            if (isNaN(issueLat) || isNaN(issueLng)) return false;
            const dist = getDistanceMeters(parseFloat(record.lat), parseFloat(record.lng), issueLat, issueLng);
            return dist <= 20; // 20-meter threshold
          });
          console.log(`Haversine Proximity Check returned ${nearbyIssues.length} active nearby issue(s) within 20m.`);
        } else {
          console.error("Proximity Check fallback fetch failed:", fetchError?.message);
        }
      }
    } catch (proximityErr) {
      console.error("Proximity Check encountered exception:", proximityErr);
    }

    // --- SEMANTIC SIMILARITY CHECK & DYNAMIC MERGING ---
    let isDuplicateConfirmed = false;
    let duplicateTargetIssue: any = null;

    if (nearbyIssues.length > 0) {
      const existingIssue = nearbyIssues[0];
      console.log(`Analyzing duplicate potential against existing issue ID ${existingIssue.id} (Category: ${existingIssue.category})`);

      try {
        const similarityPrompt = `
You are a senior civic infrastructure dispatcher. Compare these two reports of civic infrastructure issues reported within 20 meters of each other.
Determine if they describe the exact same physical infrastructure issue (e.g., the same pothole, the same water leak, the same trash pile, the same dead streetlight) or if they are separate/unrelated issues.

Existing Report:
- Category: ${existingIssue.category}
- Description: "${existingIssue.description || "No description provided."}"

New Report:
- Category: ${category || "Other"} ${custom_category_note ? `(Custom Note: ${custom_category_note})` : ""}
- Description: "${description || "No description provided."}"

Respond with a JSON object containing EXACTLY these two fields:
1. "isDuplicate": boolean (true if both reports describe the exact same physical infrastructure issue, false otherwise).
2. "reasoning": string (a short explanation of your decision).
`;

        const similarityResponse = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: { parts: [{ text: similarityPrompt }] },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                isDuplicate: {
                  type: "BOOLEAN",
                  description: "True if both reports describe the exact same infrastructure issue, False otherwise."
                },
                reasoning: {
                  type: "STRING",
                  description: "A short, objective summary explaining why they are or are not the same issue."
                }
              },
              required: ["isDuplicate", "reasoning"]
            }
          }
        });

        const similarityResult = JSON.parse(similarityResponse.text?.trim() || "{}");
        if (similarityResult.isDuplicate === true) {
          isDuplicateConfirmed = true;
          duplicateTargetIssue = existingIssue;
          console.log(`Gemini confirmed duplicate of Issue ID ${existingIssue.id}. Reasoning: ${similarityResult.reasoning}`);
        } else {
          console.log(`Gemini determined they are distinct issues. Reasoning: ${similarityResult.reasoning}`);
        }
      } catch (simErr) {
        console.error("Semantic Similarity check failed, continuing as distinct issue:", simErr);
      }
    }

    if (isDuplicateConfirmed && duplicateTargetIssue) {
      console.log(`DEDUPLICATION TRIGGERED: Merging report ${id} into existing issue ${duplicateTargetIssue.id}`);
      
      // Delete the newly inserted duplicate row so no redundant row exists (c. Do NOT create a new row)
      const { error: deleteErr } = await supabase
        .from("issues")
        .delete()
        .eq("id", id);
      
      if (deleteErr) {
        console.error(`Failed to delete duplicate row ${id}:`, deleteErr.message);
      }

      // Aggregate report logs
      const nextReportCount = (duplicateTargetIssue.report_count || 1) + 1;
      const timestamp = new Date().toISOString();
      const newLogEntry = `[${timestamp}] Duplicate Report: "${description || "No description provided."}"`;
      const nextAuditLog = duplicateTargetIssue.audit_log 
        ? `${duplicateTargetIssue.audit_log}\n${newLogEntry}`
        : `[Original Report] "${duplicateTargetIssue.description || "No description provided."}"\n${newLogEntry}`;
      
      const nextPrecedence = (duplicateTargetIssue.precedence || 1) + 1;

      // Update existing issue row
      const { error: updateErr } = await supabase
        .from("issues")
        .update({
          report_count: nextReportCount,
          audit_log: nextAuditLog,
          precedence: nextPrecedence,
          ai_advice: `AI Deduplication Active: Merged multiple user reports. Total dispatches: ${nextReportCount}. Ready for urgent resolver action.`
        })
        .eq("id", duplicateTargetIssue.id);

      if (updateErr) {
        console.warn("Schema does not support report_count/audit_log. Applying resilient text fallback in ai_advice...", updateErr.message);
        // Fallback update
        await supabase
          .from("issues")
          .update({
            precedence: nextPrecedence,
            ai_advice: `${duplicateTargetIssue.ai_advice || ""}\n\n[Duplicate Report - ${timestamp}] ${description || "No description provided."}`
          })
          .eq("id", duplicateTargetIssue.id);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        duplicate: true, 
        mergedInto: duplicateTargetIssue.id,
        assessment: { category: duplicateTargetIssue.category, severity: duplicateTargetIssue.severity_level || "Medium" }
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        status: 200,
      });
    }

    // --- REGULAR DISPATCH PIPELINE ---
    console.log(`Processing Ticket ID: ${id} as a distinct issue. Preparing standard Gemini Smart Dispatch analysis...`);

    // Add text prompt specifying analysis and custom category rules
    const textPrompt = `
You are a senior civic infrastructure dispatcher. Analyze the following reported issue to classify its category and assess its severity.

Original Reported Category: "${category || "Other"}"
Custom Category Note (if provided): "${custom_category_note || "None"}"
Issue Description: "${description || "No description provided."}"

Classification Rules:
1. If the user selected 'Other' and provided a 'Custom Category Note', analyze this note carefully to see if it can be mapped to one of our core categories:
   - "Pothole" (e.g. potholes, road damage, cracks, broken pavements)
   - "Water Leakage" (e.g. water leaks, pipe bursts, flooded streets, sewage overflow)
   - "Waste Overflow" (e.g. overflowing trash bins, street litter, dirty block piles)
   - "Dead Streetlight" (e.g. non-functional lamp, dark lanes)
   Otherwise, if it does not match, it should remain categorized as "Other".
2. Assess the severity priority as one of: "High", "Medium", or "Low".

You must respond with a JSON object containing EXACTLY these two fields:
1. "severity": String must be one of: "High", "Medium", "Low".
2. "category": String must be one of: "Pothole", "Water Leakage", "Waste Overflow", "Dead Streetlight", "Other".

Provide a precise, objective evaluation.
`;

    // Query Google Gemini model (gemini-3.5-flash) with structured JSON schema
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [{ text: textPrompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            severity: {
              type: "STRING",
              description: "The assessed severity priority: 'High', 'Medium', or 'Low'."
            },
            category: {
              type: "STRING",
              description: "The classified infrastructure category: 'Pothole', 'Water Leakage', 'Waste Overflow', 'Dead Streetlight', or 'Other'."
            }
          },
          required: ["severity", "category"]
        }
      }
    });

    const responseText = response.text?.trim() || "";
    console.log("Raw Gemini AI response received:", responseText);

    // Parse and validate JSON outcome
    let aiAssessment: { severity: string; category: string };
    try {
      aiAssessment = JSON.parse(responseText);
    } catch (parseErr) {
      console.warn("Failed to parse Gemini JSON output. Attempting regex extract...", parseErr);
      const severityMatch = responseText.match(/"severity"\s*:\s*"([^"]+)"/i);
      const categoryMatch = responseText.match(/"category"\s*:\s*"([^"]+)"/i);
      aiAssessment = {
        severity: severityMatch ? severityMatch[1] : "Medium",
        category: categoryMatch ? categoryMatch[1] : "Other",
      };
    }

    // Standardize severity and category values to match expected db and client constraints
    let finalSeverity = "Medium";
    if (aiAssessment.severity?.toLowerCase().includes("high")) finalSeverity = "High";
    else if (aiAssessment.severity?.toLowerCase().includes("low")) finalSeverity = "Low";

    let finalCategory = "Other";
    const mappedCat = aiAssessment.category?.toLowerCase() || "";
    if (mappedCat.includes("pothole") || mappedCat.includes("road") || mappedCat.includes("damage")) {
      finalCategory = "Pothole";
    } else if (mappedCat.includes("water") || mappedCat.includes("leak") || mappedCat.includes("log")) {
      finalCategory = "Water Leakage";
    } else if (mappedCat.includes("waste") || mappedCat.includes("trash") || mappedCat.includes("garbage") || mappedCat.includes("overflow")) {
      finalCategory = "Waste Overflow";
    } else if (mappedCat.includes("light") || mappedCat.includes("street") || mappedCat.includes("lamp")) {
      finalCategory = "Dead Streetlight";
    }

    console.log(`Smart Dispatch Assessment: Category classified as "${finalCategory}", Severity assessed as "${finalSeverity}".`);

    // Update row with AI results
    const { error: dbError } = await supabase
      .from("issues")
      .update({
        severity_level: finalSeverity,
        category: finalCategory,
        status: "Pending", // Ensure it is set to 'Pending' on successful analysis
        ai_advice: `AI Smart Dispatch categorized this under ${finalCategory} with ${finalSeverity} priority. Ready for municipal review.`,
      })
      .eq("id", id);

    if (dbError) {
      throw new Error(`Failed to update database with AI assessment: ${dbError.message}`);
    }

    console.log(`Ticket ID ${id} successfully processed and updated.`);

    return new Response(JSON.stringify({ success: true, duplicate: false, assessment: { category: finalCategory, severity: finalSeverity } }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 200,
    });

  } catch (err: any) {
    console.error("Smart Dispatch pipeline encountered an error:", err.message);

    // Fallback recovery: Ensure status defaults to 'Pending'
    try {
      const payload = await req.clone().json().catch(() => ({}));
      const recordId = payload.record?.id;
      if (recordId) {
        console.log(`Initiating fallback recovery for Ticket ID: ${recordId}. Setting status to Pending.`);
        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          await supabase
            .from("issues")
            .update({
              status: "Pending",
              severity_level: "Medium",
              category: "Other",
              ai_advice: "Smart Dispatch assessment failed. Defaulted to standard Pending status."
            })
            .eq("id", recordId);
          console.log("Fallback recovery successfully completed in database.");
        }
      }
    } catch (fallbackErr: any) {
      console.error("Critical: Could not apply fallback status to database:", fallbackErr.message);
    }

    return new Response(JSON.stringify({ error: err.message, success: false }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 500,
    });
  }
});
