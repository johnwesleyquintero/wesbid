import React, { useState, useMemo, useEffect } from "react";
import { 
  Calculator, 
  Sparkles, 
  Trash2, 
  Info, 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Copy, 
  Check, 
  Plus, 
  Clipboard, 
  FileText,
  Calendar,
  Eye,
  MousePointerClick,
  ShoppingBag,
  HelpCircle
} from "lucide-react";

interface ManualRow {
  id: string;
  label: string;
  currentAcos: number;
  cpc: number;
  targetAcos: number;
}

export default function QuickAcosCalculator() {
  const [pasteText, setPasteText] = useState<string>(() => {
    return localStorage.getItem("wesbid_quick_calc_paste") || "";
  });
  
  const [targetAcos, setTargetAcos] = useState<number>(() => {
    const saved = localStorage.getItem("wesbid_quick_calc_target_acos");
    return saved !== null ? parseFloat(saved) : 30.0;
  });

  const [copiedBid, setCopiedBid] = useState(false);
  const [addedPlaceholder, setAddedPlaceholder] = useState<string | null>(null);

  // Sync states to localStorage
  useEffect(() => {
    localStorage.setItem("wesbid_quick_calc_paste", pasteText);
  }, [pasteText]);

  useEffect(() => {
    localStorage.setItem("wesbid_quick_calc_target_acos", targetAcos.toString());
  }, [targetAcos]);

  // Robust parsing of Amazon Ads Console copied widgets
  const parsedData = useMemo(() => {
    if (!pasteText.trim()) return null;

    const lines = pasteText.split("\n").map(l => l.trim()).filter(Boolean);
    
    let impressions = 0;
    let clicks = 0;
    let purchases = 0; // standard Amazon label
    let cpc = 0;
    let sales = 0;
    let spend = 0;
    let acos = 0;
    let dateRange = "";

    const parseNum = (str: string) => {
      // Remove symbols, currency marks, percent, commas, spaces
      return parseFloat(str.replace(/[^\d.-]/g, "")) || 0;
    };
    const parseIntNum = (str: string) => {
      return parseInt(str.replace(/[^\d-]/g, ""), 10) || 0;
    };

    // 1. Line-by-line matching with view details / labels
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Date Range match
      if (/Date\s*range/i.test(line) && i + 1 < lines.length) {
        let nextIdx = i + 1;
        // Skip over empty or layout noise
        while (nextIdx < lines.length && (/view\s*details/i.test(lines[nextIdx]) || lines[nextIdx] === "")) {
          nextIdx++;
        }
        if (nextIdx < lines.length) {
          dateRange = lines[nextIdx];
        }
      }

      // Impressions match
      if (/Impressions/i.test(line) && i + 1 < lines.length) {
        let nextIdx = i + 1;
        while (nextIdx < lines.length && /view\s*details/i.test(lines[nextIdx])) nextIdx++;
        if (nextIdx < lines.length) {
          impressions = parseIntNum(lines[nextIdx]);
        }
      }

      // Clicks match
      if (/Clicks/i.test(line) && i + 1 < lines.length) {
        let nextIdx = i + 1;
        while (nextIdx < lines.length && /view\s*details/i.test(lines[nextIdx])) nextIdx++;
        if (nextIdx < lines.length) {
          clicks = parseIntNum(lines[nextIdx]);
        }
      }

      // Purchases match
      if ((/Purchases/i.test(line) || /Orders/i.test(line)) && i + 1 < lines.length) {
        let nextIdx = i + 1;
        while (nextIdx < lines.length && /view\s*details/i.test(lines[nextIdx])) nextIdx++;
        if (nextIdx < lines.length) {
          purchases = parseIntNum(lines[nextIdx]);
        }
      }

      // CPC match
      if (/CPC/i.test(line) && i + 1 < lines.length) {
        let nextIdx = i + 1;
        while (nextIdx < lines.length && /view\s*details/i.test(lines[nextIdx])) nextIdx++;
        if (nextIdx < lines.length) {
          cpc = parseNum(lines[nextIdx]);
        }
      }

      // Sales match
      if (/Sales/i.test(line) && i + 1 < lines.length) {
        let nextIdx = i + 1;
        while (nextIdx < lines.length && /view\s*details/i.test(lines[nextIdx])) nextIdx++;
        if (nextIdx < lines.length) {
          sales = parseNum(lines[nextIdx]);
        }
      }

      // Spend match
      if (/Spend/i.test(line) && i + 1 < lines.length) {
        let nextIdx = i + 1;
        while (nextIdx < lines.length && /view\s*details/i.test(lines[nextIdx])) nextIdx++;
        if (nextIdx < lines.length) {
          spend = parseNum(lines[nextIdx]);
        }
      }

      // ACOS match
      if (/ACOS/i.test(line) && i + 1 < lines.length) {
        let nextIdx = i + 1;
        while (nextIdx < lines.length && /view\s*details/i.test(lines[nextIdx])) nextIdx++;
        if (nextIdx < lines.length) {
          acos = parseNum(lines[nextIdx]);
        }
      }
    }

    // 2. Direct regex searches as fallback (in case it is wrapped horizontally or key-value style)
    if (clicks === 0) {
      const match = pasteText.match(/clicks\s*[:\s]*([\d,]+)/i);
      if (match) clicks = parseIntNum(match[1]);
    }
    if (impressions === 0) {
      const match = pasteText.match(/impressions\s*[:\s]*([\d,]+)/i);
      if (match) impressions = parseIntNum(match[1]);
    }
    if (purchases === 0) {
      const match = pasteText.match(/(purchases|orders)\s*[:\s]*([\d,]+)/i);
      if (match) purchases = parseIntNum(match[2]);
    }
    if (cpc === 0) {
      const match = pasteText.match(/cpc\s*[:\s]*\$?\s*([\d.,]+)/i);
      if (match) cpc = parseNum(match[1]);
    }
    if (sales === 0) {
      const match = pasteText.match(/sales\s*[:\s]*\$?\s*([\d.,]+)/i);
      if (match) sales = parseNum(match[1]);
    }
    if (spend === 0) {
      const match = pasteText.match(/spend\s*[:\s]*\$?\s*([\d.,]+)/i);
      if (match) spend = parseNum(match[1]);
    }
    if (acos === 0) {
      const match = pasteText.match(/acos\s*[:\s]*([\d.,]+)%?/i);
      if (match) acos = parseNum(match[1]);
    }

    // Secondary heuristics synthesis
    if (spend === 0 && clicks > 0 && cpc > 0) {
      spend = clicks * cpc;
    }
    if (cpc === 0 && clicks > 0 && spend > 0) {
      cpc = spend / clicks;
    }
    if (acos === 0 && sales > 0 && spend > 0) {
      acos = (spend / sales) * 100;
    }

    // Double check ACOS bounds
    const cleanAcos = acos > 0 ? acos : (sales > 0 && spend > 0 ? (spend / sales) * 100 : 0);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cvr = clicks > 0 ? (purchases / clicks) * 100 : 0;

    return {
      dateRange: dateRange.trim() || undefined,
      impressions,
      clicks,
      purchases,
      cpc,
      sales,
      spend,
      acos: cleanAcos,
      ctr,
      cvr
    };
  }, [pasteText]);

  // Compute live bidding calculations for the parsed target
  const calculatedResult = useMemo(() => {
    if (!parsedData || parsedData.cpc <= 0 || parsedData.acos <= 0) return null;

    const currentAcosDec = parsedData.acos / 100;
    const targetAcosDec = targetAcos / 100;
    const thresholdDec = 0.84 * targetAcosDec;
    const isUnderThreshold = currentAcosDec < thresholdDec;

    let computedBid = 0;
    if (currentAcosDec <= 0) {
      computedBid = parsedData.cpc;
    } else if (isUnderThreshold) {
      computedBid = parsedData.cpc * 1.20;
    } else {
      computedBid = (parsedData.cpc / currentAcosDec) * targetAcosDec;
    }

    // Round nicely to cents
    computedBid = Math.max(0.02, Number(computedBid.toFixed(2)));

    return {
      computedBid,
      isUnderThreshold,
      thresholdPct: thresholdDec * 100,
      formulaExplanation: isUnderThreshold
        ? `Since parsed ACOS (${parsedData.acos.toFixed(1)}%) is less than 84% of your target threshold (${(thresholdDec * 100).toFixed(1)}%), we have triggered Wesley's High-Performing Bid scaling: average CPC ($${parsedData.cpc.toFixed(2)}) is boosted by +20%.`
        : `Since parsed ACOS (${parsedData.acos.toFixed(1)}%) is above the safety threshold limit (${(thresholdDec * 100).toFixed(1)}%), we adjust the bid downwards to align with targets: (CPC $${parsedData.cpc.toFixed(2)} / Acos ${(currentAcosDec).toFixed(4)}) × Target Acos ${(targetAcosDec).toFixed(2)}.`,
      mathStep: isUnderThreshold
        ? `$${parsedData.cpc.toFixed(2)} × 1.20 = $${computedBid.toFixed(2)}`
        : `($${parsedData.cpc.toFixed(2)} / ${(parsedData.acos / 100).toFixed(4)}) × ${(targetAcos / 100).toFixed(2)} = $${computedBid.toFixed(2)}`
    };
  }, [parsedData, targetAcos]);

  // Load sample dynamic helper
  const handleLoadSample = () => {
    const sample = `Date range

Jun 8 - Jun 15, 2026

Impressions

13,830
View details
Clicks

160
View details
Purchases

47
View details
CPC

$1.98
View details
Sales

$342.09
View details`;
    setPasteText(sample);
  };

  const handleClear = () => {
    setPasteText("");
  };

  const handleCopyBid = () => {
    if (!calculatedResult) return;
    navigator.clipboard.writeText(`$${calculatedResult.computedBid.toFixed(2)}`);
    setCopiedBid(true);
    setTimeout(() => setCopiedBid(false), 2000);
  };

  // Add the newly calculated row directly to the main Scratchpad table
  const handleAddToScratchpad = () => {
    if (!parsedData || !calculatedResult) return;

    try {
      const saved = localStorage.getItem("wesbid_manual_scratchpad_rows");
      let activeList: ManualRow[] = [];
      if (saved) {
        try {
          activeList = JSON.parse(saved);
        } catch {
          activeList = [];
        }
      }

      const freshLabel = parsedData.dateRange 
        ? `Console Paste: ${parsedData.dateRange} (${parsedData.clicks} clicks)`
        : `Console Paste Target (${parsedData.clicks} Clicks)`;

      const newRowItem: ManualRow = {
        id: Date.now().toString(),
        label: freshLabel,
        currentAcos: Number(parsedData.acos.toFixed(1)),
        cpc: Number(parsedData.cpc.toFixed(2)),
        targetAcos: targetAcos
      };

      const updated = [...activeList, newRowItem];
      localStorage.setItem("wesbid_manual_scratchpad_rows", JSON.stringify(updated));
      
      // Dispatch a synthetic storage event so other components state-update reactive counters
      window.dispatchEvent(new Event("storage"));
      
      setAddedPlaceholder(newRowItem.label);
      setTimeout(() => setAddedPlaceholder(null), 3000);
    } catch (e) {
      console.error("Could not add to Scratchpad list:", e);
    }
  };

  return (
    <div className="space-y-6" id="quick-acos-calculator-tab">
      
      <div className="bg-white border border-slate-200 shadow-3xs rounded-xl p-5 sm:p-6">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1.5 uppercase tracking-wide">
          <Clipboard className="w-4.5 h-4.5 text-brand" />
          Direct Console Parser & Quick ACOS Calculator
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed font-medium">
          Ditch the manual transcribing. Direct-copy the entire summary tile list or tables from your Seller Central Amazon Advertising Campaign Console, drop the block below, and let the parser resolve metric telemetry on the fly.
        </p>

        {/* Text Paste and Options bar */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* PASTE FIELD (Left) */}
          <div className="lg:col-span-6 flex flex-col space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Seller Central Raw Paste Area
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="px-2.5 py-1 text-[10.5px] font-bold text-brand bg-brand/5 hover:bg-brand hover:text-white border border-brand/20 rounded transition cursor-pointer select-none"
                >
                  Load Sample Console Data
                </button>
                {pasteText && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1 px-2.5 text-[10.5px] font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded transition cursor-pointer select-none"
                  >
                    Clear Paste
                  </button>
                )}
              </div>
            </div>

            <textarea
              className="w-full h-80 px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-xl font-mono text-[11px] leading-relaxed text-slate-700 placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand/10 focus:border-brand shadow-inner transition grow"
              placeholder={`Example Copy-Paste structure:\n\nImpressions\n13,830\n\nClicks\n160\n\nPurchases\n47\n\nCPC\n$1.98\n\nSales\n$342.09...`}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              id="raw-console-paste-input"
            />
            
            <div className="bg-slate-50 border border-slate-150 rounded-lg p-3 text-[10px] text-slate-500 leading-snug font-medium">
              <span className="font-bold text-slate-700 block mb-0.5">ℹ️ Parse Signature:</span>
              Our background engine maps continuous lines, vertical cards, or standard tabbed rows. It extracts <strong>Clicks</strong>, <strong>CPC</strong>, <strong>Purchases</strong>, <strong>Sales</strong>, and <strong>Impressions</strong> automatically, running real-time division checks to clean mathematical formatting errors.
            </div>
          </div>

          {/* PARSED TELEMETRY VIEW & RESULT SHEET (Right) */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            {parsedData ? (
              <div className="space-y-4 animate-fade-in flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      Parsed Campaign Telemetry
                    </span>
                    {parsedData.dateRange && (
                      <span className="inline-flex items-center gap-1 text-[10.5px] text-brand bg-brand/[0.04] px-2 py-0.5 rounded border border-brand/10 font-bold font-sans">
                        <Calendar className="w-3 h-3" />
                        {parsedData.dateRange}
                      </span>
                    )}
                  </div>

                  {/* High Density Parsed Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    
                    {/* Imp */}
                    <div className="bg-white border border-slate-200/70 p-2.5 rounded-lg shadow-3xs flex flex-col justify-center">
                      <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                        <Eye className="w-2.5 h-2.5 text-slate-400" />
                        Impressions
                      </span>
                      <span className="text-sm font-extrabold text-slate-800 font-mono mt-0.5">
                        {parsedData.impressions > 0 ? parsedData.impressions.toLocaleString() : "—"}
                      </span>
                    </div>

                    {/* Clicks */}
                    <div className="bg-white border border-slate-200/70 p-2.5 rounded-lg shadow-3xs flex flex-col justify-center">
                      <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                        <MousePointerClick className="w-2.5 h-2.5 text-indigo-500" />
                        Clicks
                      </span>
                      <span className="text-sm font-extrabold text-slate-800 font-mono mt-0.5">
                        {parsedData.clicks > 0 ? parsedData.clicks.toLocaleString() : "0"}
                      </span>
                    </div>

                    {/* Purchases */}
                    <div className="bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-lg shadow-3xs flex flex-col justify-center">
                      <span className="text-[8.5px] font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                        <ShoppingBag className="w-2.5 h-2.5 text-emerald-600" />
                        Purchases
                      </span>
                      <span className="text-sm font-extrabold text-emerald-950 font-mono mt-0.5">
                        {parsedData.purchases > 0 ? parsedData.purchases.toLocaleString() : "0"}
                      </span>
                    </div>

                    {/* CPC */}
                    <div className="bg-indigo-50/10 border border-indigo-100 p-2.5 rounded-lg shadow-3xs flex flex-col justify-center">
                      <span className="text-[8.5px] font-bold text-indigo-800 uppercase tracking-wide flex items-center gap-1">
                        <DollarSign className="w-2.5 h-2.5 text-indigo-500" />
                        Avg. CPC
                      </span>
                      <span className="text-sm font-extrabold text-indigo-950 font-mono mt-0.5">
                        {parsedData.cpc > 0 ? `$${parsedData.cpc.toFixed(2)}` : "—"}
                      </span>
                    </div>

                    {/* Calculated Spend */}
                    <div className="bg-white border border-slate-200/70 p-2.5 rounded-lg shadow-3xs flex flex-col justify-center">
                      <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wide">
                        Ad Spend (Est.)
                      </span>
                      <span className="text-xs font-bold text-slate-600 font-mono mt-0.5">
                        {parsedData.spend > 0 ? `$${parsedData.spend.toFixed(2)}` : "—"}
                      </span>
                    </div>

                    {/* Sales */}
                    <div className="bg-white border border-slate-200/70 p-2.5 rounded-lg shadow-3xs flex flex-col justify-center">
                      <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wide">
                        Gross Sales
                      </span>
                      <span className="text-xs font-bold text-slate-900 font-mono mt-0.5">
                        {parsedData.sales > 0 ? `$${parsedData.sales.toFixed(2)}` : "—"}
                      </span>
                    </div>

                    {/* Calculated CTR */}
                    <div className="bg-white border border-slate-200/70 p-2.5 rounded-lg shadow-3xs flex flex-col justify-center">
                      <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wide">
                        Est. CTR
                      </span>
                      <span className="text-xs font-semibold text-slate-600 font-mono mt-0.5">
                        {parsedData.ctr > 0 ? `${parsedData.ctr.toFixed(2)}%` : "0.00%"}
                      </span>
                    </div>

                    {/* Calculated CVR */}
                    <div className="bg-emerald-50/10 border border-emerald-100 p-2.5 rounded-lg shadow-3xs flex flex-col justify-center">
                      <span className="text-[8.5px] font-bold text-emerald-800 uppercase tracking-wide">
                        Est. CVR
                      </span>
                      <span className="text-xs font-bold text-emerald-950 font-mono mt-0.5">
                        {parsedData.cvr > 0 ? `${parsedData.cvr.toFixed(1)}%` : "0.0%"}
                      </span>
                    </div>

                  </div>

                  {/* Calculated ACOS Metric Banner */}
                  <div className="mt-3.5 bg-slate-900 text-white rounded-xl p-3 flex items-center justify-between border border-slate-850 select-none shadow-3xs">
                    <div>
                      <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400">Calculated Current Match-ACOS</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-xl font-black font-mono text-white">
                          {parsedData.acos > 0 ? `${parsedData.acos.toFixed(1)}%` : "0.0%"}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium font-sans">ACOS (Spend / Sales ratio)</span>
                      </div>
                    </div>
                    <div>
                      {parsedData.acos > 0 ? (
                        <div className={`px-2 py-0.5 rounded text-[9px] font-bold font-sans uppercase border ${
                          parsedData.acos <= 20 
                            ? "bg-emerald-900/40 text-emerald-300 border-emerald-800"
                            : parsedData.acos <= 40
                            ? "bg-indigo-900/40 text-indigo-300 border-indigo-800"
                            : "bg-rose-900/40 text-rose-300 border-rose-800"
                        }`}>
                          {parsedData.acos <= 20 ? "Highly Profitable" : parsedData.acos <= 40 ? "Within Normal Target" : "Over-target Bleeder"}
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-400 italic">No Sales Record</span>
                      )}
                    </div>
                  </div>

                  {/* Target ACOS Coefficient Slider */}
                  <div className="mt-4 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1.5 shadow-3xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-700 flex items-center gap-1 uppercase tracking-wide">
                        <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                        Expected Destination Target ACOS
                      </span>
                      <div className="flex items-center gap-1 bg-white px-2 py-0.5 border border-slate-200 rounded font-mono text-xs font-extrabold text-indigo-950">
                        <span>{targetAcos}%</span>
                      </div>
                    </div>
                    <input 
                      type="range"
                      min="5"
                      max="120"
                      step="1"
                      value={targetAcos}
                      onChange={(e) => setTargetAcos(Number(e.target.value))}
                      className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-ew-resize mt-1"
                    />
                    <div className="flex justify-between text-[8.5px] text-slate-400 font-bold font-mono">
                      <span>Low ACOS Ceiling (5%)</span>
                      <span>High Volume Expansion (120%)</span>
                    </div>
                  </div>

                </div>

                {/* COMPUTED ACTION PANEL */}
                {calculatedResult ? (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mt-4 relative overflow-hidden flex flex-col justify-between shrink-0">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Calculated Max Bid (WesBid v2)</span>
                          <p className="text-3xl font-black font-sans text-slate-900 tracking-tight flex items-baseline">
                            <span className="text-slate-400 text-xl font-bold mr-0.5">$</span>
                            {calculatedResult.computedBid.toFixed(2)}
                            <span className="text-[9px] font-bold text-slate-500 uppercase ml-2 tracking-widest font-sans">
                              New suggested bid
                            </span>
                          </p>
                        </div>
                        <div className="shrink-0">
                          {calculatedResult.isUnderThreshold ? (
                            <span className="inline-flex px-2 px-1.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-black uppercase tracking-wider select-none">
                              🚀 Under Threshold (+20%)
                            </span>
                          ) : (
                            <span className="inline-flex px-2 px-1.5 rounded-md bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider select-none">
                              🎯 Dynamic Convergence
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Math Proof */}
                      <div className="mt-3.5 border-t border-slate-200 pt-3 text-[11px] leading-relaxed text-slate-600 font-medium">
                        <span className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Mathematical Proof & Formula Resolve</span>
                        <p className="text-slate-700 leading-normal mb-2">{calculatedResult.formulaExplanation}</p>
                        <div className="p-1 px-2.5 bg-white rounded border border-slate-100 font-mono text-[10.5px] font-bold text-indigo-900 flex justify-between items-center sm:w-auto">
                          <span>{calculatedResult.mathStep}</span>
                          <span className="text-[8px] text-slate-400 uppercase font-sans font-black px-1.5 py-0.5 bg-slate-50 rounded select-none border">
                            Max Bid Limit
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick copy / Add to scratchpad */}
                    <div className="mt-4 pt-3.5 border-t border-slate-200 flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={handleCopyBid}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition cursor-pointer select-none"
                      >
                        {copiedBid ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied $${calculatedResult.computedBid.toFixed(2)}!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Custom Bid</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleAddToScratchpad}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/50 font-bold rounded-lg text-xs transition cursor-pointer select-none"
                      >
                        {addedPlaceholder ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600 truncate max-w-[150px]">Added to Table!</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span className="truncate">Save to Sandbox Scratchpad</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 text-xs text-slate-500 font-bold leading-relaxed text-center flex items-center justify-center h-44 mt-4">
                    <div className="space-y-1">
                      <Calculator className="w-6 h-6 text-slate-350 mx-auto mb-1 animate-bounce" />
                      <p>Enter positive CPC $ and Sales $ values to calculate target bids.</p>
                      <p className="text-[10px] text-slate-400 font-medium">Currently: Avg CPC is ${parsedData.cpc.toFixed(2)}, ACOS is {parsedData.acos.toFixed(1)}%</p>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-10 text-center text-slate-400 flex flex-col justify-center items-center h-full min-h-[300px]">
                <Calculator className="w-10 h-10 text-slate-350 mb-3" />
                <h4 className="text-xs font-bold text-slate-600 mb-1 leading-none uppercase tracking-wide">Awaiting Console Data Paste</h4>
                <p className="text-[11px] text-slate-400 max-w-sm leading-normal">
                  Copy dynamic widget metric cards from Seller Central or write manual entries. The parsing system will construct operational values immediately.
                </p>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-250 hover:border-slate-350 rounded-lg text-xs font-bold transition shadow-3xs cursor-pointer select-none"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Try Loading Sample Copy Block
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
