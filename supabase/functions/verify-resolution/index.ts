import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenAI } from "npm:@google/genai";
import { Buffer } from "node:buffer";

// Helper function to fetch an image with a strict timeout and encode it as Base64
async function fetchImageAsBase64(url: string, timeoutMs: number = 8000): Promise<{ base64: string; mimeType: string }> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log(`[VerifyResolution] Fetching image with ${timeoutMs}ms timeout: ${url}`);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);

    if (!response.ok) {
      throw new Error(`Failed to download image. Status: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return { base64, mimeType: contentType };
  } catch (err: any) {
    clearTimeout(id);
    if (err.name === "AbortError") {
      throw new Error(`Image download timed out after ${timeoutMs}ms for URL: ${url}`);
    }
    throw err;
  }
}

serve(async (req) => {
  // 1. CORS Preflight Configuration
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // 2. Fetch required environment configurations
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!geminiApiKey) {
      throw new Error("Missing GEMINI_API_KEY environment variable.");
    }
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).");
    }

    // Initialize Supabase admin client and Gemini SDK
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build-verifier",
        },
      },
    });

    // 3. Parse and Validate Request Webhook Payload
    const payload = await req.json();
    console.log("[VerifyResolution] Received Webhook Payload:", JSON.stringify(payload));

    // Webhooks send details inside record/old_record or just directly inside body
    const record = payload.record || payload.new || payload;
    const issueId = record.id;

    if (!issueId) {
      return new Response(JSON.stringify({ error: "Missing required 'id' attribute in payload." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // To prevent race conditions or missing parameters, fetch the latest issue state from DB
    console.log(`[VerifyResolution] Querying database for latest state of Issue #${issueId}`);
    const { data: issue, error: dbFetchError } = await supabase
      .from("issues")
      .select("id, before_image_url, after_image_url, status")
      .eq("id", issueId)
      .single();

    if (dbFetchError || !issue) {
      throw new Error(`Failed to fetch latest record for issue ${issueId}: ${dbFetchError?.message || "Not found"}`);
    }

    const { before_image_url, after_image_url } = issue;

    if (!after_image_url) {
      console.log(`[VerifyResolution] Issue #${issueId} has no after_image_url yet. Skipping verification.`);
      return new Response(JSON.stringify({ success: false, message: "No after_image_url present on the issue record." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`[VerifyResolution] Retrieved files for verification:
      - Before Image: ${before_image_url || "None provided"}
      - After Image: ${after_image_url}`);

    // Helper to standardise and retrieve absolute public URLs from relative Supabase Storage paths
    const getAbsoluteUrl = (pathOrUrl: string): string => {
      if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
        return pathOrUrl;
      }
      // If it is a storage reference, extract public URL (assumes 'issue-images' bucket, fallback to 'issues')
      const bucket = "issue-images";
      const { data } = supabase.storage.from(bucket).getPublicUrl(pathOrUrl);
      return data.publicUrl;
    };

    const absoluteAfterUrl = getAbsoluteUrl(after_image_url);
    const absoluteBeforeUrl = before_image_url ? getAbsoluteUrl(before_image_url) : null;

    // 4. Download and convert images to Base64 with a 10s individual timeout
    const contents: any[] = [];
    
    const systemPrompt = `You are a civic infrastructure quality assurance inspector. Compare these two images. The first is the reported damage, the second is the current state. Determine if the issue is 'Resolved' (the damage is fully repaired and the site is safe) or 'Not Resolved' (the damage persists or the repair is inadequate).

You MUST output your assessment as a strict JSON object with exactly these keys:
{
  "isResolved": boolean,
  "reasoning": "A concise explanation of your visual comparison, mentioning specific visual evidence or defects remaining/fixed."
}`;

    contents.push({ text: systemPrompt });

    // Try fetching 'before_image'
    if (absoluteBeforeUrl) {
      try {
        const beforeImgData = await fetchImageAsBase64(absoluteBeforeUrl, 10000);
        contents.push({
          inlineData: {
            mimeType: beforeImgData.mimeType,
            data: beforeImgData.base64,
          }
        });
        console.log("[VerifyResolution] Successfully appended before_image to multimodal request.");
      } catch (err: any) {
        console.warn(`[VerifyResolution] Warning: Could not process before_image: ${err.message}. Proceeding with after_image only.`);
      }
    } else {
      console.log("[VerifyResolution] No before_image URL available. Evaluating based purely on after_image current repair state.");
    }

    // Fetch mandatory 'after_image'
    try {
      const afterImgData = await fetchImageAsBase64(absoluteAfterUrl, 10000);
      contents.push({
        inlineData: {
          mimeType: afterImgData.mimeType,
          data: afterImgData.base64,
        }
      });
      console.log("[VerifyResolution] Successfully appended after_image to multimodal request.");
    } catch (err: any) {
      throw new Error(`Failed to process after_image_url: ${err.message}`);
    }

    // 5. Query Gemini 1.5 Pro (or gemini-2.5-pro/gemini-1.5-pro model aliases) using the modern GoogleGenAI SDK
    console.log("[VerifyResolution] Dispatching multimodal assessment to Gemini 1.5 Pro...");
    const modelResponse = await ai.models.generateContent({
      model: "gemini-1.5-pro",
      contents: { parts: contents },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            isResolved: {
              type: "BOOLEAN",
              description: "True if the damage is fully repaired and the site is safe; false otherwise."
            },
            reasoning: {
              type: "STRING",
              description: "Expert comparison summary details of the reported repairs."
            }
          },
          required: ["isResolved", "reasoning"]
        }
      }
    });

    const outputText = modelResponse.text?.trim() || "";
    console.log("[VerifyResolution] Gemini QA Response:", outputText);

    // 6. Parse and apply conditional database update logic
    let verification: { isResolved: boolean; reasoning: string };
    try {
      verification = JSON.parse(outputText);
    } catch (e) {
      console.warn("[VerifyResolution] Failed to parse strict JSON. Fallback to regex parse...");
      const isResolved = outputText.toLowerCase().includes('"isresolved": true') || outputText.toLowerCase().includes('"isresolved":true');
      const reasoningMatch = outputText.match(/"reasoning"\s*:\s*"([^"]+)"/i);
      verification = {
        isResolved,
        reasoning: reasoningMatch ? reasoningMatch[1] : "Multimodal analysis concluded repair evaluation."
      };
    }

    // 7. Update status to 'Resolved' or 'Requires Review' + resolution_feedback
    const targetStatus = verification.isResolved ? "Resolved" : "Requires Review";
    console.log(`[VerifyResolution] Updating Issue #${issueId}:
      - Status: ${targetStatus}
      - Feedback: ${verification.reasoning}`);

    const { error: dbUpdateError } = await supabase
      .from("issues")
      .update({
        status: targetStatus,
        resolution_feedback: verification.reasoning,
        ai_advice: `AI Verification: ${verification.isResolved ? "Verified Repaired" : "Failed Inspection"} - ${verification.reasoning}`
      })
      .eq("id", issueId);

    if (dbUpdateError) {
      throw new Error(`Failed to update issue status in database: ${dbUpdateError.message}`);
    }

    console.log(`[VerifyResolution] Issue #${issueId} verification workflow executed successfully.`);

    return new Response(JSON.stringify({
      success: true,
      isResolved: verification.isResolved,
      reasoning: verification.reasoning,
      status: targetStatus
    }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 200,
    });

  } catch (err: any) {
    console.error("[VerifyResolution] Fatal error in verification execution pipeline:", err.message);
    return new Response(JSON.stringify({ error: err.message, success: false }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 500,
    });
  }
});
