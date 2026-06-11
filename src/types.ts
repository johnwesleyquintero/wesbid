/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AmazonPpcRow {
  id: string; // generated unique id
  campaign: string;
  adGroup: string;
  targeting: string; // Keyword or ASIN
  matchType: string;
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  cpc: number;
  orders: number;
  sales: number;
  acos: number; // calculated as spend / sales, or parsed from report
  cvr: number; // orders / clicks
  currentBid?: number; // optionally parsed from report
  impressionShare?: number; // Top-of-search Impression Share percent
  searchTerms?: {
    term: string;
    impressions: number;
    clicks: number;
    spend: number;
    sales: number;
    orders: number;
    acos: number;
  }[];
}

export interface BidRecommendation {
  rowId: string;
  targeting: string;
  campaign: string;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  acos: number;
  cpc: number;
  currentBid: number;
  suggestedBid: number;
  action: "SCALE" | "HOLD" | "REDUCE";
  reason: string;
  confidence: "High" | "Medium" | "Low";
  isOverridden: boolean; // whether the user manually tweaked the bid
}

export interface OptimizerConfig {
  targetAcos: number;      // target ACOS percent (e.g. 30)
  minClicks: number;       // click threshold for learning phase (e.g. 20)
  minBid: number;          // floor limit for bid ($)
  maxBid: number;          // ceiling limit for bid ($)
  dampening: number;       // bid dampening factor (0 = hold, 1 = direct target ratio adjustment)
  bleederClicks: number;   // clicks with 0 sales before applying bleeder reduction
  bleederReduction: number; // reduction multiplier or percent for zero-sales bleeders (e.g. 30%)
  enableV3?: boolean;       // Enable adaptive memory / learning-phase controls
  confidenceScale?: number; // Adaptive coefficient scaling percent (0-100)
  adaptiveDecay?: number;   // Dynamic decay scale percent (0-100)
}

export type StrategyPreset = "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE" | "HARVEST";

export interface StrategyDefinition {
  name: string;
  description: string;
  config: OptimizerConfig;
}

export interface ScenarioImpact {
  originalAvgBid: number;
  suggestedAvgBid: number;
  bidChangePercent: number;
  totalOriginalSpend: number;
  estimatedNewSpend: number;
  scaleCount: number;
  holdCount: number;
  reduceCount: number;
  bleederCount: number;
}
