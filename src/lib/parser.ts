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

  const idxCampaign = getIndex(["Campaign", "Campaign Name", "campaign"]);
  const idxAdGroup = getIndex(["Ad Group", "Ad Group Name", "adgroup", "ad groups"]);
  const idxTargeting = getIndex(["Keyword", "Targeting", "Customer Search Term", "Search Term", "Keyword or product targeting", "target", "searchTerm"]);
  const idxMatchType = getIndex(["Match Type", "Matchtype", "match"]);
  const idxImpressions = getIndex(["Impressions", "Impr", "impr", "impression"]);
  const idxClicks = getIndex(["Clicks", "clicks", "clickcount"]);
  const idxSpend = getIndex(["Spend", "spend", "cost", "total spend"]);
  const idxSales = getIndex(["Sales", "Total Sales", "7 Day Total Sales", "7-day total sales", "total sales", "revenue", "sales volume"]);
  const idxOrders = getIndex(["Orders", "Total Orders", "7 Day Total Orders", "7-day total orders", "total orders", "purchases", "order count"]);
  const idxCpc = getIndex(["CPC", "Cost Per Click", "Cost per click (CPC)", "cpc"]);
  const idxBid = getIndex(["Bid", "Current Bid", "Max Bid", "Keyword Bid", "bid", "ad group bid"]);

  const rows: AmazonPpcRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    if (cells.length < 3) continue; // skip corrupted small rows

    const campaign = idxCampaign !== -1 ? cells[idxCampaign] : "Default Campaign";
    const adGroup = idxAdGroup !== -1 ? cells[idxAdGroup] : "Default Ad Group";
    
    // Extract keyword or targeting clause
    let targeting = "General Targeting";
    if (idxTargeting !== -1 && cells[idxTargeting]) {
      targeting = cells[idxTargeting].replace(/^"(.*)"$/, "$1"); // strip wrapping quotes
    }
    
    const matchType = idxMatchType !== -1 ? cells[idxMatchType] || "-" : "-";
    const impressions = idxImpressions !== -1 ? parseNumeric(cells[idxImpressions]) : 0;
    const clicks = idxClicks !== -1 ? parseNumeric(cells[idxClicks]) : 0;
    const spend = idxSpend !== -1 ? parseNumeric(cells[idxSpend]) : 0;
    const sales = idxSales !== -1 ? parseNumeric(cells[idxSales]) : 0;
    const orders = idxOrders !== -1 ? parseNumeric(cells[idxOrders]) : 0;
    
    // Derived values
    const ctr = impressions > 0 ? clicks / impressions : 0;
    const cvr = clicks > 0 ? orders / clicks : 0;
    const cpc = clicks > 0 ? spend / clicks : (idxCpc !== -1 ? parseNumeric(cells[idxCpc]) : 0);
    const acos = sales > 0 ? spend / sales : 0;

    // Optional parsed bid: if not present, we will estimate or use a default bid of $1.00
    let currentBid: number | undefined = undefined;
    if (idxBid !== -1 && cells[idxBid]) {
      const bVal = parseNumeric(cells[idxBid]);
      if (bVal > 0) currentBid = bVal;
    }

    rows.push({
      id: `ppc_${i}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      campaign,
      adGroup,
      targeting,
      matchType,
      impressions,
      clicks,
      ctr,
      spend,
      cpc: Number(cpc.toFixed(2)),
      orders,
      sales,
      acos,
      cvr,
      currentBid
    });
  }

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
