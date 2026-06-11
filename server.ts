/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy-initialized Gemini API client
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is is not configured. Please supply it via AI Studio Secrets panel.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// AI PPC Co-pilot Insight Generation
app.post("/api/copilot", async (req, res) => {
  try {
    const { 
      strategyName, 
      config, 
      stats, 
      topBleeders, 
      topStars,
      totalRows
    } = req.body;

    if (!stats) {
      return res.status(400).json({ error: "Missing PPC dataset metrics in payload" });
    }

    const ai = getGeminiClient();

    const systemInstruction = 
      "You are WesBid Lab AI Co-pilot, an elite Amazon Advertising PPC analyst and portfolio strategist. " +
      "You write highly structured, professional, clinical, data-driven memos to sellers and PPC managers. " +
      "You never sound hyperactive or use marketing fluff. Use precise PPC terminology like ACOS, target CPC, " +
      "spend velocity, conversion drag, bid elasticity, negative-match pruning, and harvesting. Avoid generalized " +
      "definitions; focus immediately on strategic decisions for this dataset.";

    const prompt = `
Analyze the following Amazon Ads PPC optimization scenario and generate a professional bid optimization memo:

### PORTFOLIO SCENARIO STATISTICS:
- Active Strategy Preset: ${strategyName}
- Total Rows Evaluated: ${totalRows}
- Target ACOS Configured: ${config.targetAcos}%
- Clicks Confidence Threshold: ${config.minClicks} clicks
- Dampening Shift Coefficient: ${config.dampening * 100}%
- Bleeder Clicks Limit: ${config.bleederClicks} clicks (Reduction of -${config.bleederReduction}%)

### FINANCIAL SIMULATION OUTCOMES:
- Total Original Spend: $${stats.totalOriginalSpend.toFixed(2)}
- Simulated New Spend Projection: $${stats.estimatedNewSpend.toFixed(2)} (Impact variance of ${stats.bidChangePercent.toFixed(1)}% bid shift)
- Original Average Bid: $${stats.originalAvgBid.toFixed(2)}
- Recommended Average Bid: $${stats.suggestedAvgBid.toFixed(2)}
- Optimized Actions: SCALE (${stats.scaleCount} keywords), REDUCE (${stats.reduceCount} keywords, including ${stats.bleederCount} bleeders), HOLD (${stats.holdCount} keywords)

### CRITICAL AD TARGETS LOG:
${topBleeders && topBleeders.length > 0 ? `
TOP ACTIVE WASTEFUL BLEEDERS (Spent budget with zero sales):
${topBleeders.map((b: any) => `- Target: "${b.targeting}" | Clicks: ${b.clicks} | Spend: $${b.spend.toFixed(2)} | Current CPC: $${b.cpc.toFixed(2)}`).join("\n")}` : "- No active absolute bleeders (>10 clicks with 0 orders) found in sample."}

${topStars && topStars.length > 0 ? `
TOP CONVERTING STAR PERFORMERS (Low ACOS / highly efficient):
${topStars.map((s: any) => `- Target: "${s.targeting}" | Clicks: ${s.clicks} | ACOS: ${(s.acos * 100).toFixed(1)}% | Sales: $${s.sales.toFixed(2)} | Current CPC: $${s.cpc.toFixed(2)}`).join("\n")}` : "- No active star performers (<20% ACOS) found in sample."}

---

Please write the optimization report divided into these specific, markdown-styled sections:

1. **Executive Portfolio Assessment**: 
   A high-level diagnostic of this portfolio's overall health and the immediate budget impact of moving from the current average bid ($${stats.originalAvgBid.toFixed(2)}) to the suggested average bid ($${stats.suggestedAvgBid.toFixed(2)}). Specifically mention what the ${stats.bidChangePercent.toFixed(1)}% shift in average bidding represents in terms of margin security.

2. **Bleeder Risk Mitigation Strategy**:
   Audit the Top Wasteful Bleeders listed. Highlight why these specific terms are leaking spend (conversion drag, search intent mismatch). Provide precise guidance on when to transition these from 'bid reduction' into active Campaign negative-matching (exact vs phrase) so the budget can be recaptured.

3. **Superstar Scaling Playbook**:
   Audit the Top Converting Star Performers. Give precise operational advice to harvest search term volume and capture Top of Search (TOS) impressions using placement percentage multiplier adjustments.

4. **Workflow Protocol Recommendations**:
   A 3-step action checklist for exporting this WesBid bulk spreadsheet and importing it into Seller Central or your PPC management stack safely without disrupting organic rank on high-performing key ASINs. Keep it under 150 words.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.25, // low temperature for precise mathematical advice
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini PPC Co-pilot execution error:", error);
    res.status(500).json({ error: error.message || "Failed to parse portfolio metrics using AWS/Gemini parser" });
  }
});

// Configure Vite or Static Assets
async function initializeServer() {
  if (process.env.NODE_ENV !== "production") {
    // Vite middleware for lightning-fast development reloads and hot module replacement
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production build static files from dist directory
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`WesBid Optimizer Server running on http://localhost:${PORT}`);
  });
}

initializeServer().catch((err) => {
  console.error("Critical server boot failure:", err);
});
