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

    const { id, description, before_image_url } = record;
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

    console.log(`Processing Ticket ID: ${id}. Preparing Gemini Smart Dispatch analysis...`);

    // 4. Construct Content Parts for Gemini
    const contents: any[] = [];
    
    // Add text prompt specifying analysis constraints
    const textPrompt = `
You are a senior civic infrastructure dispatcher. Analyze the following reported issue description and image (if provided) to classify and assess severity.

Issue Description: "${description || "No description provided."}"

You must respond with a JSON object containing EXACTLY these two fields:
1. "severity": String must be one of: "High", "Medium", "Low".
2. "category": String must be one of: "Road Damage", "Water Logging", "Other".

Provide a precise, objective evaluation.
`;
    contents.push({ text: textPrompt });

    // Download and append before_image_url if present
    if (before_image_url && before_image_url.startsWith("http")) {
      try {
        console.log(`Fetching issue evidence image: ${before_image_url}`);
        const imageRes = await fetch(before_image_url);
        if (imageRes.ok) {
          const contentType = imageRes.headers.get("content-type") || "image/jpeg";
          const arrayBuffer = await imageRes.arrayBuffer();
          const base64Data = Buffer.from(arrayBuffer).toString("base64");
          
          contents.push({
            inlineData: {
              mimeType: contentType,
              data: base64Data,
            },
          });
          console.log("Evidence image successfully appended to multimodal contents.");
        } else {
          console.warn(`Failed to fetch image from URL: ${before_image_url}. Status: ${imageRes.status}. Continuing with text-only analysis.`);
        }
      } catch (imageErr) {
        console.warn("Could not retrieve or process image, falling back to text-only analysis:", imageErr);
      }
    }

    // 5. Query Google Gemini model (gemini-3.5-flash) with structured JSON schema
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: contents },
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
              description: "The classified infrastructure category: 'Road Damage', 'Water Logging', or 'Other'."
            }
          },
          required: ["severity", "category"]
        }
      }
    });

    const responseText = response.text?.trim() || "";
    console.log("Raw Gemini AI response received:", responseText);

    // 6. Parse and validate JSON outcome
    let aiAssessment: { severity: string; category: string };
    try {
      aiAssessment = JSON.parse(responseText);
    } catch (parseErr) {
      console.warn("Failed to parse Gemini JSON output. Attempting regex extract...", parseErr);
      // Regex fallback just in case Deno JSON parser fails on minor markdown wrapping
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
    if (aiAssessment.category?.toLowerCase().includes("road") || aiAssessment.category?.toLowerCase().includes("damage")) {
      finalCategory = "Road Damage";
    } else if (aiAssessment.category?.toLowerCase().includes("water") || aiAssessment.category?.toLowerCase().includes("log")) {
      finalCategory = "Water Logging";
    }

    console.log(`Smart Dispatch Assessment: Category classified as "${finalCategory}", Severity assessed as "${finalSeverity}".`);

    // 7. Update row with AI results
    const { error: dbError } = await supabase
      .from("issues")
      .update({
        severity_level: finalSeverity, // Map as needed for your database schema columns
        category: finalCategory,
        status: "Pending", // Ensure it is set to 'Pending' on successful analysis
        ai_advice: `AI Smart Dispatch categorized this under ${finalCategory} with ${finalSeverity} priority. Ready for municipal review.`,
      })
      .eq("id", id);

    if (dbError) {
      throw new Error(`Failed to update database with AI assessment: ${dbError.message}`);
    }

    console.log(`Ticket ID ${id} successfully processed and updated.`);

    return new Response(JSON.stringify({ success: true, assessment: { category: finalCategory, severity: finalSeverity } }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 200,
    });

  } catch (err: any) {
    console.error("Smart Dispatch pipeline encountered an error:", err.message);

    // 8. Error Handling Fallback: Ensure status defaults to 'Pending'
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
