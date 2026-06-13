/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AmazonPpcRow, BidRecommendation, OptimizerConfig, StrategyPreset, StrategyDefinition, ScenarioImpact } from "../types";

export const STRATEGY_PRESETS: Record<StrategyPreset, StrategyDefinition> = {
  CONSERVATIVE: {
    name: "Conservative Guard",
    description: "Strict safety thresholds. Aims for low waste and maximum profitability, scaling very carefully.",
    config: {
      targetAcos: 20,
      minClicks: 25,
      minBid: 0.15,
      maxBid: 2.00,
      dampening: 0.50,
      bleederClicks: 12,
      bleederReduction: 35,
      enableV3: true,
      confidenceScale: 90,
      adaptiveDecay: 10,
      exactMatchBoost: 10,
      broadMatchDiscount: 15,
      tosPlacementBoost: 10
    }
  },
  BALANCED: {
    name: "Standard Balanced",
    description: "The classic bid optimization. Maintains a standard target ACOS with balanced data confidence rules.",
    config: {
      targetAcos: 30,
      minClicks: 20,
      minBid: 0.15,
      maxBid: 3.50,
      dampening: 0.70,
      bleederClicks: 15,
      bleederReduction: 25,
      enableV3: true,
      confidenceScale: 75,
      adaptiveDecay: 15,
      exactMatchBoost: 10,
      broadMatchDiscount: 15,
      tosPlacementBoost: 15
    }
  },
  AGGRESSIVE: {
    name: "Aggressive Scale",
    description: "Prioritizes market share and sales scale. Lower clicks threshold allows rapid bid raises for top terms.",
    config: {
      targetAcos: 45,
      minClicks: 12,
      minBid: 0.25,
      maxBid: 6.00,
      dampening: 0.90,
      bleederClicks: 20,
      bleederReduction: 15,
      enableV3: true,
      confidenceScale: 60,
      adaptiveDecay: 25,
      exactMatchBoost: 15,
      broadMatchDiscount: 10,
      tosPlacementBoost: 20
    }
  },
  HARVEST: {
    name: "Harvest Profit Mode",
    description: "Deep cleanup mode. Heavily punishes bleeding search terms and pushes bids down to extract margin.",
    config: {
      targetAcos: 25,
      minClicks: 15,
      minBid: 0.05,
      maxBid: 2.50,
      dampening: 0.60,
      bleederClicks: 10,
      bleederReduction: 40,
      enableV3: true,
      confidenceScale: 85,
      adaptiveDecay: 30,
      exactMatchBoost: 5,
      broadMatchDiscount: 20,
      tosPlacementBoost: 10
    }
  }
};

/**
 * Executes bid optimization for a single keyword row.
 */
export function calculateRowBid(row: AmazonPpcRow, config: OptimizerConfig): BidRecommendation {
  const currentBid = row.currentBid || row.cpc || 1.00;
  const cpc = row.cpc > 0 ? row.cpc : currentBid;

  // Retrieve dynamic modifiers from config (or fall back to standard defaults if undefined)
  const exactMatchBoost = config.exactMatchBoost !== undefined ? config.exactMatchBoost : 10;
  const broadMatchDiscount = config.broadMatchDiscount !== undefined ? config.broadMatchDiscount : 15;
  const tosPlacementBoost = config.tosPlacementBoost !== undefined ? config.tosPlacementBoost : 15;

  // Establish baseline meta parameters based on Targeting Intent classification (Amazon Modern PPC Meta Strategy)
  let targetAcos = config.targetAcos;
  let minClicks = config.minClicks;
  let bleederClicks = config.bleederClicks;
  let dampening = config.dampening;
  let strategyModifierReason = "";

  const matchTypeUpper = (row.matchType || "").toUpperCase();
  const targetingLower = (row.targeting || "").toLowerCase();
  
  const isExact = matchTypeUpper === "EXACT" || targetingLower.includes("[exact]") || targetingLower.includes("exact");
  const isBroadOrPhrase = matchTypeUpper === "BROAD" || matchTypeUpper === "PHRASE" || targetingLower.includes("broad") || targetingLower.includes("phrase");
  const isAutoTarget = ["loose-match", "close-match", "substitutes", "complements"].includes(targetingLower) || row.matchType === "-";
  const isAsinTarget = targetingLower.startsWith("asin=") || targetingLower.startsWith("asin-expanded=") || row.adGroup.toLowerCase().includes("asin") || row.campaign.toLowerCase().includes("asin");

  if (isExact) {
    // Exact match targets have high conversion certainty. Elevate Target ACOS (scale focus), lower learning click boundaries, and give more safety slack.
    targetAcos = config.targetAcos * (1 + exactMatchBoost / 100); 
    minClicks = Math.max(5, Math.round(config.minClicks * 0.70)); 
    bleederClicks = Math.round(config.bleederClicks * 1.30); 
    dampening = Math.min(1.0, config.dampening * 1.15); 
    strategyModifierReason = `(Meta: EXACT Match +${exactMatchBoost}% Priority scaling). `;
  } else if (isBroadOrPhrase || isAutoTarget) {
    // Broad/Phrase and Auto matches easily eat up excess click waste. Apply discounted target ACOS and accelerate click budget protection thresholds.
    targetAcos = config.targetAcos * (1 - broadMatchDiscount / 100); 
    minClicks = Math.round(config.minClicks * 1.25); 
    bleederClicks = Math.max(5, Math.round(config.bleederClicks * 0.80)); 
    strategyModifierReason = `(Meta: Broad/Auto -${broadMatchDiscount}% budget waste prevention). `;
  } else if (isAsinTarget) {
    // ASIN detail page placements (PAT). Higher impressions, slightly lower CTR on pages. Give slightly shorter learning phase.
    minClicks = Math.max(8, Math.round(config.minClicks * 0.90)); 
    strategyModifierReason = "(Meta: ASIN page placement parameters applied). ";
  }

  // Layer 1: Data Safety (Learning Phase protection)
  if (row.clicks < minClicks && row.orders === 0) {
    return {
      rowId: row.id,
      targeting: row.targeting,
      campaign: row.campaign,
      clicks: row.clicks,
      spend: row.spend,
      sales: row.sales,
      orders: row.orders,
      acos: row.acos,
      cpc,
      currentBid,
      suggestedBid: Number(currentBid.toFixed(2)),
      action: "HOLD",
      reason: `${strategyModifierReason}Insufficent data: ${row.clicks}/${minClicks} clicks (Learning phase protection).`,
      confidence: "Low",
      isOverridden: false
    };
  }

  // Layer 2: Bleeder Penalty (Spent money with 0 orders)
  if (row.clicks >= bleederClicks && row.orders === 0) {
    const penaltyRatio = 1 - (config.bleederReduction / 100);
    let targetBid = currentBid * penaltyRatio;
    
    // clamp it
    targetBid = Math.max(config.minBid, Math.min(config.maxBid, targetBid));

    return {
      rowId: row.id,
      targeting: row.targeting,
      campaign: row.campaign,
      clicks: row.clicks,
      spend: row.spend,
      sales: row.sales,
      orders: row.orders,
      acos: 0,
      cpc,
      currentBid,
      suggestedBid: Number(targetBid.toFixed(2)),
      action: "REDUCE",
      reason: `${strategyModifierReason}Bleeder flagged: ${row.clicks} clicks with $${row.spend.toFixed(2)} spend and 0 sales. Reducing bid by ${config.bleederReduction}%.`,
      confidence: row.clicks >= bleederClicks * 1.5 ? "High" : "Medium",
      isOverridden: false
    };
  }

  // Layer 3: ACOS-Based Formula Optimization
  if (row.sales > 0 && row.acos > 0) {
    const targetAcosMultiplier = targetAcos / 100;
    const currentAcosRatio = targetAcosMultiplier / row.acos;

    // Apply Dampening: suggestedBid = currentBid + (dampened_change)
    const rawTargetBid = currentBid * currentAcosRatio;
    const difference = rawTargetBid - currentBid;

    // Dynamic Level 3 memory dampening (state-driven weighting)
    let adaptiveMultiplier = 1.0;
    let adaptiveNote = "";
    if (config.enableV3) {
      if (row.orders === 1) {
        adaptiveMultiplier = 0.50; // single conversion is highly volatile, scale back adjustment speed by 50%
        adaptiveNote = "(V3: 50% speed applied due to single-order state volatility). ";
      } else if (row.orders <= 3) {
        adaptiveMultiplier = 0.80; // moderate confidence
        adaptiveNote = "(V3: 80% speed applied for low-volume conversion state). ";
      } else {
        adaptiveMultiplier = 1.00; // stable high confidence
        adaptiveNote = "(V3: 100% full learning speed applied to stable volume). ";
      }
      
      // Decay Weight Proxy: if our current ACOS is quite high, we drag bid slightly down to counter performance decay
      if (row.acos > targetAcosMultiplier) {
        const decayScale = (config.adaptiveDecay !== undefined ? config.adaptiveDecay : 15) / 100;
        adaptiveMultiplier *= (1 - decayScale * 0.5); // decay dampens bid increases or slows down high ACOS bid hikes
      }
    }

    const finalDampening = dampening * adaptiveMultiplier;
    const dampenedBid = currentBid + (difference * finalDampening);

    let suggestedBid = dampenedBid;

    // Conquering placements in the top listings is the primary meta of modern Amazon PPC.
    // If the keyword runs in high profit margin (ACOS is under 90% of target ACOS) and our Search Share is low (< 25%), we issue a Top-of-Search placement multiplier.
    // UPGRADED GATE: "Conversion stability > Traffic expansion" checks
    let isTosBoosted = false;
    let tosNotes = "";
    if (row.impressionShare !== undefined && row.impressionShare > 0 && row.impressionShare < 25 && row.acos < (targetAcos / 100) * 0.90) {
      const passesSafetyGate = row.clicks >= 5 && row.orders >= 1;
      if (passesSafetyGate) {
        suggestedBid = suggestedBid * (1 + tosPlacementBoost / 100); // Secures configurable placement bid boost
        isTosBoosted = true;
      } else {
        tosNotes = ` [TOS_GATE_HOLD]: High-margin candidate detected (Acos ${(row.acos * 100).toFixed(0)}%), but ${tosPlacementBoost}% Top-of-Screen Placement Boost held back until conversion reaches 5 clicks and 1 order (current: ${row.clicks} clicks, ${row.orders} orders) for safety.`;
      }
    }

    // Clamp to floor and ceiling
    suggestedBid = Math.max(config.minBid, Math.min(config.maxBid, suggestedBid));

    const currentAcosPercent = Math.round(row.acos * 100);
    const ratioValue = targetAcos / currentAcosPercent;

    let action: "SCALE" | "REDUCE" | "HOLD" = "HOLD";
    let reason = "";
    
    if (ratioValue > 1.05) {
      action = "SCALE";
      reason = `${strategyModifierReason}${adaptiveNote}Highly profitable ACOS (${currentAcosPercent}% vs target ${Math.round(targetAcos)}%). Scaling bid upward by ${(finalDampening * 100).toFixed(0)}% of headroom.`;
    } else if (ratioValue < 0.95) {
      action = "REDUCE";
      reason = `${strategyModifierReason}${adaptiveNote}Inefficient ACOS (${currentAcosPercent}% vs target ${Math.round(targetAcos)}%). Trimming bid lower towards target CPC.`;
    } else {
      action = "HOLD";
      reason = `${strategyModifierReason}${adaptiveNote}ACOS inside optimized target envelope (${currentAcosPercent}% vs target ${Math.round(targetAcos)}%). Maintaining bid stability.`;
    }

    if (isTosBoosted && row.impressionShare !== undefined) {
      reason += ` [PLA_BOOST]: Added ${tosPlacementBoost}% Top-of-Search bid boost since search share is critically low (${row.impressionShare.toFixed(1)}%) but ACOS is efficient.`;
    }

    if (tosNotes) {
      reason += tosNotes;
    }

    // Confidence index
    const confidence = row.clicks >= 40 ? "High" : (row.clicks >= 20 ? "Medium" : "Low");

    return {
      rowId: row.id,
      targeting: row.targeting,
      campaign: row.campaign,
      clicks: row.clicks,
      spend: row.spend,
      sales: row.sales,
      orders: row.orders,
      acos: row.acos,
      cpc,
      currentBid,
      suggestedBid: Number(suggestedBid.toFixed(2)),
      action,
      reason,
      confidence,
      isOverridden: false
    };
  }

  // Default fallback (e.g. clicks were < min clicks or sales were 0 but didn't trigger bleeder)
  return {
    rowId: row.id,
    targeting: row.targeting,
    campaign: row.campaign,
    clicks: row.clicks,
    spend: row.spend,
    sales: row.sales,
    orders: row.orders,
    acos: row.acos,
    cpc,
    currentBid,
    suggestedBid: Number(currentBid.toFixed(2)),
    action: "HOLD",
    reason: `${strategyModifierReason}Low activity keyword. Holding placement to monitor performance.`,
    confidence: "Low",
    isOverridden: false
  };
}

/**
 * Calculates aggregated scenario simulation metrics for comparing Before vs After states.
 */
export function calculateScenarioImpact(rows: AmazonPpcRow[], recommendations: Record<string, BidRecommendation>): ScenarioImpact {
  if (rows.length === 0) {
    return {
      originalAvgBid: 0,
      suggestedAvgBid: 0,
      bidChangePercent: 0,
      totalOriginalSpend: 0,
      estimatedNewSpend: 0,
      scaleCount: 0,
      holdCount: 0,
      reduceCount: 0,
      bleederCount: 0
    };
  }

  let totalOriginalBid = 0;
  let totalSuggestedBid = 0;
  let totalSpend = 0;
  let estimatedNewSpend = 0;

  let scaleCount = 0;
  let holdCount = 0;
  let reduceCount = 0;
  let bleederCount = 0;

  rows.forEach(row => {
    const rec = recommendations[row.id];
    const origBid = row.currentBid || row.cpc || 1.00;
    const suggBid = rec ? rec.suggestedBid : origBid;

    totalOriginalBid += origBid;
    totalSuggestedBid += suggBid;
    totalSpend += row.spend;

    // Estimate new spend: we model new spend as proportional to bid changes, assuming CPC changes by factor of bid changes
    const bidChangeRatio = origBid > 0 ? (suggBid / origBid) : 1;
    
    // Model spend elasticity: bid increases increase impressions/clicks, decreases reduce them.
    // Elasticity factor: 0.75 is a reasonable realistic PPC approximation
    const elasticity = 0.75;
    const spendMultiplier = 1 + (bidChangeRatio - 1) * elasticity;
    const estimatedRowSpend = Math.max(0, row.spend * spendMultiplier);
    estimatedNewSpend += estimatedRowSpend;

    if (rec) {
      if (rec.action === "SCALE") scaleCount++;
      else if (rec.action === "HOLD") holdCount++;
      else if (rec.action === "REDUCE") {
        reduceCount++;
        if (rec.reason.toLowerCase().includes("bleeder")) {
          bleederCount++;
        }
      }
    } else {
      holdCount++;
    }
  });

  const originalAvgBid = totalOriginalBid / rows.length;
  const suggestedAvgBid = totalSuggestedBid / rows.length;
  const bidChangePercent = originalAvgBid > 0 ? ((suggestedAvgBid - originalAvgBid) / originalAvgBid) * 100 : 0;

  return {
    originalAvgBid,
    suggestedAvgBid,
    bidChangePercent,
    totalOriginalSpend: totalSpend,
    estimatedNewSpend,
    scaleCount,
    holdCount,
    reduceCount,
    bleederCount
  };
}
