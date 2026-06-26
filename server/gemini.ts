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

    const response = await client.models.generateContent({
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
    });

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
  } catch (error) {
    console.error("Error analyzing issue using Gemini SDK in analyzeInfrastructureIssue:", error);
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
