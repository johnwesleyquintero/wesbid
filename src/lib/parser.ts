/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AmazonPpcRow } from "../types";

/**
 * Normalizes text to easily check for header matching.
 */
function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

/**
 * Standardizes match type string cells.
 */
function sanitizeMatchType(raw: string): string {
  if (!raw) return "-";
  const lower = raw.toLowerCase().trim();
  if (lower.includes("exact")) return "Exact";
  if (lower.includes("phrase")) return "Phrase";
  if (lower.includes("broad")) return "Broad";
  if (lower.includes("auto")) return "Auto";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * Standardizes a string cell into a clean float value.
 */
function parseNumeric(val: string): number {
  if (!val) return 0;
  // Strip currency symbols, percentages, commas, and trim
  const clean = val.replace(/[\$,€,£,%\s]/g, "").replace(/,/g, "").trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * Parses CSV/TSV data into structured Amazon PPC Rows.
 */
export function parseAmazonReport(rawText: string): AmazonPpcRow[] {
  if (!rawText || !rawText.trim()) return [];

  // Detect delimiter (tab or comma)
  const lines = rawText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  const isTsv = firstLine.includes("\t") && !firstLine.includes(",");
  const delimiter = isTsv ? "\t" : ",";

  // Helper to split line supporting quoted strings with commas inside, simple and bulletproof
  const splitLine = (line: string): string[] => {
    if (isTsv) return line.split("\t");
    
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = splitLine(lines[0]).map(h => normalizeHeader(h));

  // Build header lookup map
  const getIndex = (aliases: string[]): number => {
    for (const alias of aliases) {
      const normAlias = normalizeHeader(alias);
      const idx = headers.indexOf(normAlias);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const idxCampaign = getIndex(["Campaign", "Campaign Name", "campaign", "Campaign name"]);
  const idxAdGroup = getIndex(["Ad Group", "Ad Group Name", "adgroup", "ad groups", "Ad group name"]);
  const idxTargeting = getIndex(["Keyword", "Targeting", "Keyword or product targeting", "target", "Targets", "targets"]);
  const idxSearchTerm = getIndex(["Customer Search Term", "Search Term", "searchTerm", "customerSearchTerm", "term"]);
  const idxMatchType = getIndex(["Match Type", "Matchtype", "match", "Targeting Type", "targetingtype", "Targeting type"]);
  const idxImpressions = getIndex(["Impressions", "Impr", "impr", "impression"]);
  const idxClicks = getIndex(["Clicks", "clicks", "clickcount"]);
  const idxSpend = getIndex(["Spend", "spend", "cost", "total spend", "Total cost", "Total cost (converted)", "totalcost", "totalcostconverted"]);
  const idxSales = getIndex(["Sales", "Total Sales", "7 Day Total Sales", "7-day total sales", "total sales", "revenue", "sales volume", "7 day total sales", "Sales (converted)", "salesconverted"]);
  const idxOrders = getIndex(["Orders", "Total Orders", "7 Day Total Orders", "7-day total orders", "total orders", "purchases", "order count", "7 day total orders (#)", "Purchases", "purchases"]);
  const idxCpc = getIndex(["CPC", "Cost Per Click", "Cost per click (CPC)", "cpc", "CPC (converted)", "cpcconverted"]);
  const idxBid = getIndex(["Bid", "Current Bid", "Max Bid", "Keyword Bid", "bid", "ad group bid", "Target bid", "Target bid (converted)", "targetbid", "targetbidconverted"]);
  const idxImpressionShare = getIndex(["Top-of-search Impression Share", "Top of Search Impression Share", "Impression Share", "impression share", "topofsearchimpressionshare", "top of search impression share"]);
  const idxDate = getIndex(["Date", "Start Date", "End Date", "Day", "Reporting Date", "Posting Date", "date", "day", "startdate"]);
  
  // Amazon Native Recommended Bid ranges
  const idxSuggLow = getIndex(["Suggested bid (low)", "Suggested bid (low)(converted)", "suggestedbidlow", "lowbid"]);
  const idxSuggMedian = getIndex(["Suggested bid (median)", "Suggested bid (median)(converted)", "suggestedbidmedian", "medianbid"]);
  const idxSuggHigh = getIndex(["Suggested bid (high)", "Suggested bid (high)(converted)", "suggestedbidhigh", "highbid"]);

  const uniqueRowsMap = new Map<string, {
    campaign: string;
    adGroup: string;
    targeting: string;
    matchType: string;
    impressions: number;
    clicks: number;
    spend: number;
    sales: number;
    orders: number;
    bids: { bid: number; date: number; index: number }[];
    suggLows: { bid: number; date: number; index: number }[];
    suggMedians: { bid: number; date: number; index: number }[];
    suggHighs: { bid: number; date: number; index: number }[];
    cpcs: number[];
    impressionShares: number[];
    searchTerms: Map<string, {
      term: string;
      impressions: number;
      clicks: number;
      spend: number;
      sales: number;
      orders: number;
    }>;
  }>();

  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    if (cells.length < 3) continue; // skip corrupted small rows

    const campaign = idxCampaign !== -1 && cells[idxCampaign] ? cells[idxCampaign].trim() : "Default Campaign";
    const adGroup = idxAdGroup !== -1 && cells[idxAdGroup] ? cells[idxAdGroup].trim() : "Default Ad Group";
    
    // Extract customer search term if present
    const customerSearchTerm = idxSearchTerm !== -1 && cells[idxSearchTerm]
      ? cells[idxSearchTerm].replace(/^"(.*)"$/, "$1").trim()
      : "";

    // Extract keyword or targeting clause
    let targeting = "General Targeting";
    if (idxTargeting !== -1 && cells[idxTargeting]) {
      targeting = cells[idxTargeting].replace(/^"(.*)"$/, "$1").trim(); // strip wrapping quotes
    } else if (customerSearchTerm) {
      // Fallback: If no dedicated target group column exists, fall back to the Search Term itself!
      targeting = customerSearchTerm;
    }
    
    const matchType = idxMatchType !== -1 && cells[idxMatchType] ? sanitizeMatchType(cells[idxMatchType]) : "-";
    const impressions = idxImpressions !== -1 ? parseNumeric(cells[idxImpressions]) : 0;
    const clicks = idxClicks !== -1 ? parseNumeric(cells[idxClicks]) : 0;
    const spend = idxSpend !== -1 ? parseNumeric(cells[idxSpend]) : 0;
    const sales = idxSales !== -1 ? parseNumeric(cells[idxSales]) : 0;
    const orders = idxOrders !== -1 ? parseNumeric(cells[idxOrders]) : 0;
    const cpc = idxCpc !== -1 ? parseNumeric(cells[idxCpc]) : (clicks > 0 ? spend / clicks : 0);
    
    // Parse Top-of-Search Impression share if present
    let impressionShare: number | undefined = undefined;
    if (idxImpressionShare !== -1 && cells[idxImpressionShare]) {
      const isVal = parseNumeric(cells[idxImpressionShare]);
      if (isVal > 0) impressionShare = isVal;
    }
    
    // Optional parsed bid: if not present, we will estimate or use a default bid of $1.00
    let currentBid: number | undefined = undefined;
    if (idxBid !== -1 && cells[idxBid]) {
      const bVal = parseNumeric(cells[idxBid]);
      if (bVal > 0) currentBid = bVal;
    }

    // Optional parsed native recommended bids
    let sugLow: number | undefined = undefined;
    if (idxSuggLow !== -1 && cells[idxSuggLow]) {
      const v = parseNumeric(cells[idxSuggLow]);
      if (v > 0) sugLow = v;
    }
    let sugMed: number | undefined = undefined;
    if (idxSuggMedian !== -1 && cells[idxSuggMedian]) {
      const v = parseNumeric(cells[idxSuggMedian]);
      if (v > 0) sugMed = v;
    }
    let sugHigh: number | undefined = undefined;
    if (idxSuggHigh !== -1 && cells[idxSuggHigh]) {
      const v = parseNumeric(cells[idxSuggHigh]);
      if (v > 0) sugHigh = v;
    }

    // Parse the date of the record if available to resolve the bid chronologically
    let rowDate = 0;
    if (idxDate !== -1 && cells[idxDate]) {
      const dateStr = cells[idxDate].replace(/^"(.*)"$/, "$1").trim();
      const parsed = Date.parse(dateStr);
      if (!isNaN(parsed)) {
        rowDate = parsed;
      }
    }

    // Standardize representation to lower-case for entity group key matching
    const key = `${campaign.toLowerCase()}::${adGroup.toLowerCase()}::${targeting.toLowerCase()}::${matchType.toLowerCase()}`;

    const existing = uniqueRowsMap.get(key);
    if (!existing) {
      const termsMap = new Map<string, {
        term: string;
        impressions: number;
        clicks: number;
        spend: number;
        sales: number;
        orders: number;
      }>();

      if (customerSearchTerm) {
        termsMap.set(customerSearchTerm.toLowerCase(), {
          term: customerSearchTerm,
          impressions,
          clicks,
          spend,
          sales,
          orders
        });
      }

      uniqueRowsMap.set(key, {
        campaign,
        adGroup,
        targeting,
        matchType,
        impressions,
        clicks,
        spend,
        sales,
        orders,
        bids: currentBid !== undefined ? [{ bid: currentBid, date: rowDate, index: i }] : [],
        suggLows: sugLow !== undefined ? [{ bid: sugLow, date: rowDate, index: i }] : [],
        suggMedians: sugMed !== undefined ? [{ bid: sugMed, date: rowDate, index: i }] : [],
        suggHighs: sugHigh !== undefined ? [{ bid: sugHigh, date: rowDate, index: i }] : [],
        cpcs: cpc > 0 ? [cpc] : [],
        impressionShares: impressionShare !== undefined ? [impressionShare] : [],
        searchTerms: termsMap
      });
    } else {
      existing.impressions += impressions;
      existing.clicks += clicks;
      existing.spend += spend;
      existing.sales += sales;
      existing.orders += orders;
      if (currentBid !== undefined) {
        existing.bids.push({ bid: currentBid, date: rowDate, index: i });
      }
      if (sugLow !== undefined) {
        existing.suggLows.push({ bid: sugLow, date: rowDate, index: i });
      }
      if (sugMed !== undefined) {
        existing.suggMedians.push({ bid: sugMed, date: rowDate, index: i });
      }
      if (sugHigh !== undefined) {
        existing.suggHighs.push({ bid: sugHigh, date: rowDate, index: i });
      }
      if (cpc > 0) {
        existing.cpcs.push(cpc);
      }
      if (impressionShare !== undefined) {
        existing.impressionShares.push(impressionShare);
      }

      if (customerSearchTerm) {
        const termKey = customerSearchTerm.toLowerCase();
        const existingTerm = existing.searchTerms.get(termKey);
        if (!existingTerm) {
          existing.searchTerms.set(termKey, {
            term: customerSearchTerm,
            impressions,
            clicks,
            spend,
            sales,
            orders
          });
        } else {
          existingTerm.impressions += impressions;
          existingTerm.clicks += clicks;
          existingTerm.spend += spend;
          existingTerm.sales += sales;
          existingTerm.orders += orders;
        }
      }
    }
  }

  const rows: AmazonPpcRow[] = [];
  let index = 1;

  uniqueRowsMap.forEach((data) => {
    const impressions = data.impressions;
    const clicks = data.clicks;
    const spend = data.spend;
    const sales = data.sales;
    const orders = data.orders;

    // Recalculate ratios cleanly
    const ctr = impressions > 0 ? clicks / impressions : 0;
    const cvr = clicks > 0 ? orders / clicks : 0;
    
    // Calculate best CPC approximation
    let cpc = 0;
    if (clicks > 0) {
      cpc = spend / clicks;
    } else if (data.cpcs.length > 0) {
      // average non-zero CPC values if clicks are zero
      cpc = data.cpcs.reduce((sum, val) => sum + val, 0) / data.cpcs.length;
    }

    const acos = sales > 0 ? spend / sales : 0;

    const resolveBids = (items: { bid: number; date: number; index: number }[]) => {
      if (items.length === 0) return undefined;
      const sorted = [...items].sort((a, b) => {
        if (a.date !== b.date) {
          return a.date - b.date;
        }
        return a.index - b.index;
      });
      return sorted[sorted.length - 1].bid;
    };

    // Preferred Bid: Latest active chronologically wins!
    const bid = resolveBids(data.bids);
    const sLow = resolveBids(data.suggLows);
    const sMedian = resolveBids(data.suggMedians);
    const sHigh = resolveBids(data.suggHighs);

    // Average Top-of-Search Impression share
    let resolvedImpShare: number | undefined = undefined;
    if (data.impressionShares && data.impressionShares.length > 0) {
      resolvedImpShare = data.impressionShares.reduce((s, v) => s + v, 0) / data.impressionShares.length;
    }

    // Convert search terms map to array, sorted descending by clicks then spend
    const searchTermsArr = data.searchTerms.size > 0
      ? Array.from(data.searchTerms.values()).map(t => ({
          term: t.term,
          impressions: t.impressions,
          clicks: t.clicks,
          spend: t.spend,
          sales: t.sales,
          orders: t.orders,
          acos: t.sales > 0 ? t.spend / t.sales : 0
        })).sort((a, b) => b.clicks - a.clicks || b.spend - a.spend)
      : undefined;

    rows.push({
      id: `ppc_${index++}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      campaign: data.campaign,
      adGroup: data.adGroup,
      targeting: data.targeting,
      matchType: data.matchType,
      impressions,
      clicks,
      ctr,
      spend,
      cpc: Number(cpc.toFixed(2)),
      orders,
      sales,
      acos,
      cvr,
      currentBid: bid,
      suggestedBidLow: sLow,
      suggestedBidMedian: sMedian,
      suggestedBidHigh: sHigh,
      impressionShare: resolvedImpShare,
      searchTerms: searchTermsArr
    });
  });

  return rows;
}

/**
 * Downloads a list of Bid Recommendations as standard Amazon Bulk Sheets compatible format or analyst CSV.
 */
export function convertToCsv(recs: AmazonPpcRow[], recommendations: { [key: string]: any }, mode: "analytical" | "amazon_bulk"): string {
  if (mode === "amazon_bulk") {
    // Generate an Amazon compatible import format
    // Amazon headers: Campaign, Ad Group, Keyword, Match Type, State, Bid
    const headers = ["Campaign", "Ad Group", "Keyword or Product Targeting", "Match Type", "State", "Bid ($)"];
    const lines = [headers.join(",")];
    
    recs.forEach(row => {
      const rec = recommendations[row.id];
      const bid = rec ? rec.suggestedBid : row.currentBid || row.cpc || 1.00;
      
      const line = [
        `"${row.campaign.replace(/"/g, '""')}"`,
        `"${row.adGroup.replace(/'/g, "''").replace(/"/g, '""')}"`,
        `"${row.targeting.replace(/"/g, '""')}"`,
        row.matchType || "Broad",
        "Enabled",
        bid.toFixed(2)
      ];
      lines.push(line.join(","));
    });
    
    return lines.join("\n");
  } else {
    // Analytical CSV export
    const headers = [
      "Campaign", 
      "Ad Group", 
      "Targeting", 
      "Impressions", 
      "Clicks", 
      "CTR (%)", 
      "Spend ($)", 
      "CPC ($)", 
      "Orders", 
      "Sales ($)", 
      "Current ACOS (%)", 
      "Estimated Current Bid ($)", 
      "Suggested Bid ($)", 
      "Action", 
      "Reason", 
      "Confidence"
    ];
    
    const lines = [headers.join(",")];
    
    recs.forEach(row => {
      const rec = recommendations[row.id];
      const recBid = rec ? rec.suggestedBid : row.currentBid || row.cpc || 1.00;
      const recAction = rec ? rec.action : "HOLD";
      const recReason = rec ? rec.reason : "Insufficient Data";
      const recConf = rec ? rec.confidence : "Low";
      
      const line = [
        `"${row.campaign.replace(/"/g, '""')}"`,
        `"${row.adGroup.replace(/"/g, '""')}"`,
        `"${row.targeting.replace(/"/g, '""')}"`,
        row.impressions,
        row.clicks,
        (row.ctr * 100).toFixed(2),
        row.spend.toFixed(2),
        row.cpc.toFixed(2),
        row.orders,
        row.sales.toFixed(2),
        (row.acos * 100).toFixed(2),
        (row.currentBid || row.cpc || 1.00).toFixed(2),
        recBid.toFixed(2),
        recAction,
        `"${recReason.replace(/"/g, '""')}"`,
        recConf
      ];
      lines.push(line.join(","));
    });
    
    return lines.join("\n");
  }
}
