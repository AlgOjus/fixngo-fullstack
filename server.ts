import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON parsing with sufficient limit for base64 images
app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI client if API Key is available
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Successfully initialized GoogleGenAI on server.");
  } catch (err) {
    console.error("Error setting up GoogleGenAI client:", err);
  }
} else {
  console.log("No GEMINI_API_KEY found in process.env. Running with robust Local AI Heuristics engine.");
}

// Local fallback heuristic analyzer
function getFallbackHeuristics(category: string, description: string) {
  const descLower = description.toLowerCase();
  let severity = 5;
  let recommendedPriority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  let safetyAdvice = 'Exercise standard caution while moving around the affected block.';
  let estimatedCostOfNeglectPerHour = 15;

  if (category === 'Potholes') {
    severity = 5;
    safetyAdvice = 'Slow down vehicles. Beware of structural water collection on rainy days.';
    estimatedCostOfNeglectPerHour = 12;
    if (descLower.includes('crater') || descLower.includes('deep') || descLower.includes('rim') || descLower.includes('accident') || descLower.includes('damage')) {
      severity = 8;
      recommendedPriority = 'HIGH';
      safetyAdvice = 'Critical hazard. Slow down to under 10 km/h. High damage risk for two-wheelers.';
      estimatedCostOfNeglectPerHour = 45;
    }
  } else if (category === 'Water Leakage') {
    severity = 6;
    safetyAdvice = 'Expect minor dampness. Wet ground risk present.';
    estimatedCostOfNeglectPerHour = 10;
    if (descLower.includes('gush') || descLower.includes('burst') || descLower.includes('flood') || descLower.includes('rupture') || descLower.includes('fountain') || descLower.includes('drinking')) {
      severity = 8;
      recommendedPriority = 'HIGH';
      safetyAdvice = 'Avoid flooding areas near pathways. Clean drinking water pipeline rupture detected.';
      estimatedCostOfNeglectPerHour = 35;
    }
  } else if (category === 'Damaged Streetlights') {
    severity = 4;
    safetyAdvice = 'Stay alert. Use walking flashlight if traveling alone after dusk.';
    estimatedCostOfNeglectPerHour = 8;
    if (descLower.includes('pitch black') || descLower.includes('dark') || descLower.includes('unsafe') || descLower.includes('accident') || descLower.includes('harassment') || descLower.includes('crime')) {
      severity = 7;
      recommendedPriority = 'HIGH';
      safetyAdvice = 'Highly dim area. Do not walk alone. Pedestrians should hold visible light pointers.';
      estimatedCostOfNeglectPerHour = 22;
    }
  } else if (category === 'Waste Management') {
    severity = 4;
    safetyAdvice = 'Keep children and pets away. Wash hands after walking past standard bins.';
    estimatedCostOfNeglectPerHour = 15;
    if (descLower.includes('overflow') || descLower.includes('smell') || descLower.includes('foul') || descLower.includes('rot') || descLower.includes('medical') || descLower.includes('stray') || descLower.includes('dog')) {
      severity = 7;
      recommendedPriority = 'HIGH';
      safetyAdvice = 'Sanitation issue. Active vector breeding zone. Avoid lingering around accumulated garbage.';
      estimatedCostOfNeglectPerHour = 30;
    }
  }

  // Double check extreme severity phrases
  if (descLower.includes('life threat') || descLower.includes('fatal') || descLower.includes('critical danger') || descLower.includes('collapsed')) {
    severity = 10;
    recommendedPriority = 'CRITICAL';
    safetyAdvice = 'IMMEDIATE LIFE HAZARD. Avoid this area entirely. Authorities have been alerted.';
    estimatedCostOfNeglectPerHour = 80;
  }

  return {
    severity,
    recommendedPriority,
    safetyAdvice,
    estimatedCostOfNeglectPerHour
  };
}

// API endpoint to analyze reported issue
app.post("/api/analyze-issue", async (req, res) => {
  try {
    const { category, description } = req.body;

    if (!category || !description) {
      return res.status(400).json({ error: "Category and Description are required." });
    }

    // Default heuristics as base
    const baseHeuristics = getFallbackHeuristics(category, description);

    if (!ai) {
      console.log(`[Heuristic AI Analysis] No Gemini Client. Evaluated:`, baseHeuristics);
      return res.json({ ...baseHeuristics, method: 'local-heuristics' });
    }

    console.log(`[Gemini AI Analysis] Analyzing issue with category: ${category}`);

    const prompt = `You are a Municipal Smart City Assessor evaluating citizen-reported hyperlocal infrastructure bugs.
    Evaluate this user report:
    - Issue Category: ${category}
    - User Description: "${description}"

    Assess it and return a valid JSON object matching the requested schema. Ensure severity is between 1 (negligible) and 10 (immediate extreme safety hazard).
    Provide realistic safety advice for citizens in one clean sentence.
    Estimate the "Cost of Neglect per hour" in USD (integer) based on wastage of utilities, risk of lawsuit, vehicle damage probability, or business impact. Keep it between 5 and 100.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert Smart City Municipal Engineer. Analyze issues objectively and output STRICTLY clean JSON matching the response schema. Never output markdown wraps or text other than the JSON object.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            severity: {
              type: Type.INTEGER,
              description: "A scale from 1 (very minor) to 10 (critical danger to life/property)."
            },
            recommendedPriority: {
              type: Type.STRING,
              description: "One of CRITICAL, HIGH, MEDIUM, LOW based on severity."
            },
            safetyAdvice: {
              type: Type.STRING,
              description: "A short, actionable safety advisory for local citizens (max 15 words)."
            },
            estimatedCostOfNeglectPerHour: {
              type: Type.INTEGER,
              description: "Estimated hourly financial cost/impact to community if unaddressed, in USD."
            }
          },
          required: ["severity", "recommendedPriority", "safetyAdvice", "estimatedCostOfNeglectPerHour"]
        }
      }
    });

    const text = response.text?.trim() || "";
    console.log(`[Gemini Response]:`, text);
    
    try {
      const parsed = JSON.parse(text);
      
      // Ensure bounds and types are correct
      const severity = Math.max(1, Math.min(10, Number(parsed.severity) || baseHeuristics.severity));
      const recommendedPriority = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(parsed.recommendedPriority)
        ? parsed.recommendedPriority
        : baseHeuristics.recommendedPriority;
      const safetyAdvice = parsed.safetyAdvice || baseHeuristics.safetyAdvice;
      const estimatedCostOfNeglectPerHour = Math.max(1, Math.min(150, Number(parsed.estimatedCostOfNeglectPerHour) || baseHeuristics.estimatedCostOfNeglectPerHour));

      return res.json({
        severity,
        recommendedPriority,
        safetyAdvice,
        estimatedCostOfNeglectPerHour,
        method: 'gemini-flash'
      });
    } catch (parseError) {
      console.error("Failed to parse Gemini JSON, falling back to heuristics:", parseError, "Original text was:", text);
      return res.json({ ...baseHeuristics, method: 'local-heuristics-parse-fallback' });
    }

  } catch (error) {
    console.error("Gemini API call failed, falling back to local heuristics:", error);
    // Safe fallback so user experience is perfect
    try {
      const { category, description } = req.body;
      const baseHeuristics = getFallbackHeuristics(category || 'Potholes', description || '');
      return res.json({ ...baseHeuristics, method: 'local-heuristics-error-fallback' });
    } catch {
      return res.status(500).json({ error: "Something went wrong on the server." });
    }
  }
});

// App health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", geminiActive: !!ai });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
