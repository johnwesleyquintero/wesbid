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
      bleederReduction: 35
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
      bleederReduction: 25
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
      bleederReduction: 15
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
      bleederReduction: 40
    }
  }
};

/**
 * Executes bid optimization for a single keyword row.
 */
export function calculateRowBid(row: AmazonPpcRow, config: OptimizerConfig): BidRecommendation {
  const currentBid = row.currentBid || row.cpc || 1.00;
  const cpc = row.cpc > 0 ? row.cpc : currentBid;

  // Layer 1: Data Safety (Learning Phase protection)
  if (row.clicks < config.minClicks && row.orders === 0) {
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
      reason: `Insufficent data: ${row.clicks}/${config.minClicks} clicks (Learning phase protection).`,
      confidence: "Low",
      isOverridden: false
    };
  }

  // Layer 2: Bleeder Penalty (Spent money with 0 orders)
  if (row.clicks >= config.bleederClicks && row.orders === 0) {
    const penaltyRatio = 1 - (config.bleederReduction / 100);
    let targetBid = cpc * penaltyRatio;
    
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
      reason: `Bleeder flagged: ${row.clicks} clicks with $${row.spend.toFixed(2)} spend and 0 sales. Reducing bid by ${config.bleederReduction}%.`,
      confidence: row.clicks >= config.bleederClicks * 1.5 ? "High" : "Medium",
      isOverridden: false
    };
  }

  // Layer 3: ACOS-Based Formula Optimization
  if (row.sales > 0 && row.acos > 0) {
    const targetAcosMultiplier = config.targetAcos / 100;
    const currentAcosRatio = targetAcosMultiplier / row.acos;

    // Apply Dampening: suggestedBid = cpc + (dampened_change)
    const rawTargetBid = cpc * currentAcosRatio;
    const difference = rawTargetBid - cpc;
    const dampenedBid = cpc + (difference * config.dampening);

    // Clamp to floor and ceiling
    let suggestedBid = Math.max(config.minBid, Math.min(config.maxBid, dampenedBid));

    const currentAcosPercent = Math.round(row.acos * 100);
    const ratioValue = config.targetAcos / currentAcosPercent;

    let action: "SCALE" | "REDUCE" | "HOLD" = "HOLD";
    let reason = "";
    
    if (ratioValue > 1.05) {
      action = "SCALE";
      reason = `Highly profitable ACOS (${currentAcosPercent}% vs target ${config.targetAcos}%). Scaling bid upward by ${(config.dampening * 100).toFixed(0)}% of potential headroom.`;
    } else if (ratioValue < 0.95) {
      action = "REDUCE";
      reason = `Inefficient ACOS (${currentAcosPercent}% vs target ${config.targetAcos}%). Trimming bid lower towards target CPC.`;
    } else {
      action = "HOLD";
      reason = `ACOS inside optimized target envelope (${currentAcosPercent}% vs target ${config.targetAcos}%). Maintaining bid stability.`;
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
    reason: `Low activity keyword. Holding placement to monitor performance.`,
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
