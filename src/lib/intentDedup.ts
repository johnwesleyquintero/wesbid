/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AutoSearchTerm {
  keyword: string;
  clicks: number;
  orders: number;
  spend: number;
}

export interface IntentKeyword {
  keyword: string;
  matchType: "EXACT" | "PHRASE" | "BROAD";
}

export interface HarvestKeyword {
  keyword: string;
  matchType: "EXACT" | "PHRASE" | "BROAD";
  bid: number;
}

export const normalize = (str: string) => str.trim().toLowerCase();

export function buildIntentSet(intent: IntentKeyword[]): Set<string> {
  return new Set(intent.map(i => normalize(i.keyword)));
}

export function getNewHarvestKeywords(
  auto: AutoSearchTerm[],
  intent: IntentKeyword[],
  customBidSeed: number = 1.50
): HarvestKeyword[] {
  const intentSet = buildIntentSet(intent);
  const results: HarvestKeyword[] = [];

  for (const row of auto) {
    const kw = normalize(row.keyword);
    const alreadyExists = intentSet.has(kw);

    if (alreadyExists) continue;

    // signal filter - minimal but safe
    const isValidSignal = row.clicks >= 1 || row.orders >= 1;
    if (!isValidSignal) continue;

    results.push({
      keyword: row.keyword,
      matchType: "PHRASE",
      bid: customBidSeed
    });
  }

  return results;
}

// Default Seed/Mock database tables mapping directly to user's real sample files
export const SAMPLE_AUTO_SEARCH_TERMS: AutoSearchTerm[] = [
  { keyword: "delivery signs for packages", clicks: 12, orders: 3, spend: 10.40 },
  { keyword: "leave packages here sign", clicks: 8, orders: 2, spend: 7.20 },
  { keyword: "package delivery sign", clicks: 15, orders: 4, spend: 13.50 },
  { keyword: "amazon delivery box sign", clicks: 5, orders: 0, spend: 4.80 },
  { keyword: "drop box signage metal", clicks: 2, orders: 0, spend: 1.90 },
  { keyword: "package box for porch", clicks: 1, orders: 0, spend: 1.10 },
  { keyword: "front door Instruction signs", clicks: 4, orders: 1, spend: 3.20 },
  { keyword: "please leave packages sign", clicks: 18, orders: 5, spend: 15.60 }
];

export const SAMPLE_INTENT_KEYWORDS: IntentKeyword[] = [
  { keyword: "delivery signs for packages", matchType: "EXACT" },
  { keyword: "package delivery sign", matchType: "EXACT" },
  { keyword: "porch delivery drop locator", matchType: "PHRASE" }
];
