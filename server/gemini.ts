import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Lazily initialize the Google Gen AI SDK to avoid crash-on-startup if GEMINI_API_KEY is missing
let ai: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required for Gemini AI features.');
    }
    ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return ai;
}

/**
 * Helper to call a Gemini API function with retries for temporary rate limits or unavailability.
 */
async function callGeminiWithRetry<T>(
  apiCall: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await apiCall();
    } catch (error: any) {
      attempt++;
      
      const errorMessage = error?.message?.toLowerCase() || '';
      const errorStatus = error?.status;
      const errorCode = error?.code || (error?.error?.code);
      
      const isRateLimit = 
        errorStatus === 'RESOURCE_EXHAUSTED' || 
        errorStatus === 429 || 
        errorCode === 429 ||
        errorMessage.includes('429') || 
        errorMessage.includes('quota') || 
        errorMessage.includes('rate limit') ||
        errorMessage.includes('exhausted');

      const isUnavailable = 
        errorStatus === 'UNAVAILABLE' || 
        errorStatus === 503 || 
        errorCode === 503 ||
        errorMessage.includes('503') || 
        errorMessage.includes('high demand') || 
        errorMessage.includes('temporary') || 
        errorMessage.includes('unavailable');

      if ((isRateLimit || isUnavailable) && attempt < retries) {
        console.warn(`[Gemini API Warning] Attempt ${attempt}/${retries} failed with ${isRateLimit ? 'Rate Limit (429)' : 'Service Unavailable (503)'}. Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2.5; // Exponential backoff with standard growth
        continue;
      }
      throw error;
    }
  }
}

/**
 * Interface representing the multimodal Gemini Visual Audit output.
 */
export interface VisualAuditResult {
  isValid: boolean;
  category: string; // 'pothole', 'street_light', 'water_leak', 'sanitation'
  riskScore: number; // 1 to 10
  repairInstructions: string;
  reason: string;
}

/**
 * Perform a server-side multimodal Gemini Visual Audit before creating any new issue.
 * Instructs Gemini to verify if the image represents a genuine infrastructure issue,
 * classify it into a specific category, assess safety risk, and provide grounded repair instructions.
 * 
 * @param imageUrlOrBase64 - The uploaded image URL or a base64-encoded data URL.
 * @param description - The user-reported text description of the issue.
 * @returns A structured VisualAuditResult object.
 */
export async function auditVisualIssue(
  imageUrlOrBase64: string,
  description: string
): Promise<VisualAuditResult> {
  if (!imageUrlOrBase64) {
    return {
      isValid: false,
      category: 'pothole',
      riskScore: 1,
      repairInstructions: '',
      reason: 'No image uploaded for visual audit.'
    };
  }

  try {
    const client = getAiClient();

    // Parse image
    let base64Data = imageUrlOrBase64;
    let mimeType = 'image/jpeg';

    if (imageUrlOrBase64.startsWith('data:')) {
      const match = imageUrlOrBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    } else if (imageUrlOrBase64.startsWith('http://') || imageUrlOrBase64.startsWith('https://')) {
      const imageRes = await fetch(imageUrlOrBase64);
      if (!imageRes.ok) {
        throw new Error(`Failed to fetch image URL: ${imageRes.statusText}`);
      }
      const arrayBuffer = await imageRes.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString('base64');
      mimeType = imageRes.headers.get('content-type') || 'image/jpeg';
    }

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    };

    const textPart = {
      text: `Analyze the provided image and description: "${description}".

Perform the following tasks:
1. Verify: Confirm if the image shows a genuine municipal or civic infrastructure issue (e.g., pothole, broken streetlight, water leak, garbage/waste pile, damaged road, or any other infrastructure/safety concern).
   - If it is a selfie, meme, spam, or unrelated scene, set "isValid" to false and return "SPAM" in the reason field.
   - For issues categorized or recognized as 'other', accept reports ONLY IF the user-provided description clearly identifies a valid infrastructure or civic issue (e.g., 'broken pipe', 'leaning wall', 'dangerous tree', etc.).
   - If the issue falls under 'other' but the description is vague, generic, or meaningless (e.g., 'Hello', 'test', 'blah', 'test report'), you MUST classify "isValid" as false and set the reason to "SPAM: Vague description for 'Other' category".
2. Analyze: Identify the specific category from: 'pothole', 'street_light', 'water_leak', 'sanitation', 'other'.
3. Risk Assessment: Assign a 'Safety Risk Score' from 1 to 10 based on the physical danger or municipal risk detected in the image.
4. Grounding: Search or determine standard municipal repair material requirements for the identified issue (e.g., for a pothole, specify using 'asphalt cold-mix') and return a brief, actionable repair instruction for the resolver.

Return a strict JSON object following the response schema.`
    };

    const response = await callGeminiWithRetry(() => client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [imagePart, textPart],
      config: {
        systemInstruction: "You are a professional civic infrastructure inspector. Always analyze the image and text objectively and output strict JSON according to the schema. No markdown formatting, no comments, no extra text.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: {
              type: Type.BOOLEAN,
              description: "True if a real infrastructure issue is present, false if spam, selfie, or unrelated."
            },
            category: {
              type: Type.STRING,
              description: "Must be exactly one of: 'pothole', 'street_light', 'water_leak', 'sanitation', 'other'."
            },
            riskScore: {
              type: Type.INTEGER,
              description: "An integer safety risk score from 1 to 10."
            },
            repairInstructions: {
              type: Type.STRING,
              description: "Brief, actionable repair steps, specifying standard municipal repair materials (e.g. 'asphalt cold-mix' for potholes)."
            },
            reason: {
              type: Type.STRING,
              description: "Explanation or justification for your validity decision."
            }
          },
          required: ["isValid", "category", "riskScore", "repairInstructions", "reason"]
        }
      }
    }));

    const text = response.text?.trim() || "";
    const parsed = JSON.parse(text) as VisualAuditResult;
    return {
      isValid: Boolean(parsed.isValid),
      category: parsed.category || 'pothole',
      riskScore: Number(parsed.riskScore) || 5,
      repairInstructions: parsed.repairInstructions || '',
      reason: parsed.reason || ''
    };

  } catch (error: any) {
    const errorMessage = error?.message || '';
    const isTemporary = errorMessage.includes('429') || errorMessage.includes('503') || errorMessage.includes('quota') || errorMessage.includes('demand') || errorMessage.includes('UNAVAILABLE') || errorMessage.includes('RESOURCE_EXHAUSTED');
    
    if (isTemporary) {
      console.warn(`[Gemini Visual Audit Warning] Gemini API is currently unavailable or quota exceeded. Smoothly falling back to robust Local Heuristic validation.`);
    } else {
      console.error("Error performing multimodal Gemini Visual Audit:", error);
    }
    
    // Fail-safe fallback logic based on the text description
    const descLower = description.toLowerCase().trim();
    const vagueTerms = ['hello', 'test', 'blah', 'test report', 'spam', 'selfie', 'test selfie', 'meme'];
    const isSpam = vagueTerms.some(term => descLower === term || descLower.includes('selfie') || descLower.includes('meme') || descLower.includes('spam'));
    
    let category = 'other';
    let riskScore = 5;
    let repairInstructions = 'Inspect and secure standard municipal patch materials.';
    
    if (descLower.includes('pothole') || descLower.includes('road')) {
      category = 'pothole';
      riskScore = 7;
      repairInstructions = 'Clean loose debris from pothole, apply standard asphalt cold-mix, and compact thoroughly using a hand tamper.';
    } else if (descLower.includes('light') || descLower.includes('bulb')) {
      category = 'street_light';
      riskScore = 5;
      repairInstructions = 'Isolate electrical feed, replace damaged LED lamp module, and verify grounding connections on the pole standard.';
    } else if (descLower.includes('leak') || descLower.includes('water')) {
      category = 'water_leak';
      riskScore = 6;
      repairInstructions = 'Excavate safely, clamp the fractured pipe section with stainless-steel repair clamps, and restore municipal pressure.';
    } else if (descLower.includes('waste') || descLower.includes('garbage') || descLower.includes('trash') || descLower.includes('dirt')) {
      category = 'sanitation';
      riskScore = 4;
      repairInstructions = 'Mobilize sanitation crew with bags, clear accumulated litter and organic debris, and spray Eco-safe disinfectant.';
    }

    return {
      isValid: !isSpam,
      category,
      riskScore,
      repairInstructions,
      reason: isSpam 
        ? `Fallback verification engine flagged description as spam or vague (Description: "${description}")`
        : `Fallback verification engine: evaluated description because connection exception occurred: ${error.message}`
    };
  }
}

/**
 * Interface representing the structured analysis output of an issue description.
 */
export interface IssueAnalysisResult {
  severity: number; // 1 to 10
  recommendedPriority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  safetyAdvice: string;
  estimatedCostOfNeglectPerHour: number;
  categorySuggestion: string;
  reasoning: string;
}

/**
 * Backend utility function to analyze infrastructure issue descriptions.
 * Uses the modern @google/genai SDK with the recommended 'gemini-3.5-flash' model.
 * 
 * @param description - The user-reported text description of the issue.
 * @param category - The reported or suspected category (e.g. 'Potholes', 'Water Leakage').
 * @returns A structured analysis result.
 */
export async function analyzeInfrastructureIssue(
  description: string,
  category: string = "General"
): Promise<IssueAnalysisResult> {
  try {
    const client = getAiClient();
    
    const prompt = `You are an expert Smart City Municipal Assessor. Please analyze the following citizen-reported municipal or infrastructure issue:
    
    Category: "${category}"
    Citizen's Description: "${description}"
    
    Evaluate this issue carefully and return a structured JSON response matching the schema.
    - severity: Scale from 1 (minor cosmetic issue) to 10 (immediate life threat, collapsed structure).
    - recommendedPriority: Must be exactly one of: CRITICAL, HIGH, MEDIUM, LOW.
    - safetyAdvice: A concise, highly actionable safety message for local pedestrians and vehicles (maximum 15 words).
    - estimatedCostOfNeglectPerHour: Estimated hourly cost in USD of ignoring this issue (e.g. water loss, legal liability, traffic congestion). Keep it between 5 and 150.
    - categorySuggestion: The most appropriate category (e.g., "Potholes", "Water Leakage", "Waste Management", "Damaged Streetlights", "General Road Hazard").
    - reasoning: Briefly explain your rating in one sentence.`;

    const response = await callGeminiWithRetry(() => client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an objective municipal engineer. Always output strict, valid JSON matching the schema. No markdown formatting, no comments, no extra text.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            severity: {
              type: Type.INTEGER,
              description: "An integer between 1 and 10 representing risk/danger level."
            },
            recommendedPriority: {
              type: Type.STRING,
              description: "Strictly one of CRITICAL, HIGH, MEDIUM, LOW."
            },
            safetyAdvice: {
              type: Type.STRING,
              description: "A short, actionable safety advisory for local citizens."
            },
            estimatedCostOfNeglectPerHour: {
              type: Type.INTEGER,
              description: "Estimated hourly cost to the city/community if left broken, in USD."
            },
            categorySuggestion: {
              type: Type.STRING,
              description: "The suggested category of the issue."
            },
            reasoning: {
              type: Type.STRING,
              description: "Brief explanation of your assessment."
            }
          },
          required: [
            "severity",
            "recommendedPriority",
            "safetyAdvice",
            "estimatedCostOfNeglectPerHour",
            "categorySuggestion",
            "reasoning"
          ]
        }
      }
    }));

    const responseText = response.text?.trim() || "";
    const parsed = JSON.parse(responseText) as IssueAnalysisResult;
    
    // Bounds check and clean response values
    return {
      severity: Math.max(1, Math.min(10, Number(parsed.severity) || 5)),
      recommendedPriority: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(parsed.recommendedPriority)
        ? parsed.recommendedPriority
        : 'MEDIUM',
      safetyAdvice: parsed.safetyAdvice || 'Exercise standard caution around the affected area.',
      estimatedCostOfNeglectPerHour: Math.max(5, Math.min(150, Number(parsed.estimatedCostOfNeglectPerHour) || 15)),
      categorySuggestion: parsed.categorySuggestion || category,
      reasoning: parsed.reasoning || 'Heuristic calculation completed.'
    };
  } catch (error: any) {
    const errorMessage = error?.message || '';
    const isTemporary = errorMessage.includes('429') || errorMessage.includes('503') || errorMessage.includes('quota') || errorMessage.includes('demand') || errorMessage.includes('UNAVAILABLE') || errorMessage.includes('RESOURCE_EXHAUSTED');
    
    if (isTemporary) {
      console.warn(`[Gemini Analysis Warning] Gemini API is currently unavailable or quota exceeded. Smoothly falling back to robust Local Heuristic rating.`);
    } else {
      console.error("Error analyzing issue using Gemini SDK in analyzeInfrastructureIssue:", error);
    }
    // Return a safe, robust fallback object
    return {
      severity: category === 'Potholes' ? 6 : 4,
      recommendedPriority: 'MEDIUM',
      safetyAdvice: 'Be cautious when navigating around the affected municipal sector.',
      estimatedCostOfNeglectPerHour: 15,
      categorySuggestion: category,
      reasoning: 'Fallback heuristic rating due to connection timeout or missing configuration.'
    };
  }
}
