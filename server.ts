import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { analyzeInfrastructureIssue, auditVisualIssue } from "./server/gemini";

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

    // Check if GEMINI_API_KEY is available. If not, use local heuristics
    if (!process.env.GEMINI_API_KEY) {
      const baseHeuristics = getFallbackHeuristics(category, description);
      console.log(`[Heuristic AI Analysis - Missing Key] Evaluated:`, baseHeuristics);
      return res.json({
        ...baseHeuristics,
        categorySuggestion: category,
        reasoning: "Local Heuristics Engine evaluated: " + baseHeuristics.safetyAdvice,
        method: 'local-heuristics'
      });
    }

    console.log(`[Gemini AI Analysis] Analyzing issue with category: ${category}`);
    
    // Call our robust backend utility function
    const analysis = await analyzeInfrastructureIssue(description, category);
    
    return res.json({
      ...analysis,
      method: 'gemini-flash'
    });

  } catch (error) {
    console.error("Gemini API call or parsing failed, falling back to local heuristics:", error);
    try {
      const { category, description } = req.body;
      const baseHeuristics = getFallbackHeuristics(category || 'Potholes', description || '');
      return res.json({
        ...baseHeuristics,
        categorySuggestion: category || 'Potholes',
        reasoning: 'Fallback heuristic calculation completed due to connection exception.',
        method: 'local-heuristics-error-fallback'
      });
    } catch {
      return res.status(500).json({ error: "Something went wrong on the server." });
    }
  }
});

// API endpoint for Multimodal Gemini Visual Audit
app.post("/api/visual-audit", async (req, res) => {
  try {
    const { imageUrl, description } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: "Image URL or base64 string is required for visual audit." });
    }

    console.log(`[Gemini Visual Audit] Auditing issue image with description length: ${description?.length || 0}`);
    
    // Call our server-side multimodal utility function
    const auditResult = await auditVisualIssue(imageUrl, description || "");
    
    return res.json(auditResult);

  } catch (error: any) {
    console.error("Gemini Visual Audit endpoint failed:", error);
    return res.status(500).json({ 
      error: "Visual audit failed on server.", 
      details: error.message 
    });
  }
});

app.post("/api/audit-image", async (req, res) => {
  try {
    const { imageUrl, description } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: "Image URL or base64 string is required for visual audit." });
    }

    console.log(`[Gemini Visual Audit] /api/audit-image Auditing issue image with description length: ${description?.length || 0}`);
    
    // Call our server-side multimodal utility function
    const auditResult = await auditVisualIssue(imageUrl, description || "");
    
    return res.json(auditResult);

  } catch (error: any) {
    console.error("Gemini Visual Audit endpoint failed:", error);
    return res.status(500).json({ 
      error: "Visual audit failed on server.", 
      details: error.message 
    });
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
