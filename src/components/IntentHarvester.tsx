/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  Sparkles, 
  Trash2, 
  Plus, 
  ClipboardCopy, 
  Check, 
  HelpCircle, 
  Filter, 
  DollarSign, 
  FolderSync, 
  FileSpreadsheet, 
  FileCode,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  AutoSearchTerm, 
  IntentKeyword, 
  HarvestKeyword, 
  getNewHarvestKeywords, 
  normalize,
  SAMPLE_AUTO_SEARCH_TERMS, 
  SAMPLE_INTENT_KEYWORDS 
} from "../lib/intentDedup";

import { AmazonPpcRow } from "../types";

export interface IntentHarvesterProps {
  rows?: AmazonPpcRow[];
}

export default function IntentHarvester({ rows = [] }: IntentHarvesterProps) {
  // Track where the current data is coming from: "sandbox" (default mock/sample data) or "spreadsheet" (real imported data)
  const [dataSource, setDataSource] = useState<"sandbox" | "spreadsheet">("sandbox");
  const [importStats, setImportStats] = useState<{ termsExtracted: number; intentsExtracted: number } | null>(null);

  // Local editable streams
  const [autoTerms, setAutoTerms] = useState<AutoSearchTerm[]>(SAMPLE_AUTO_SEARCH_TERMS);
  const [intentKws, setIntentKws] = useState<IntentKeyword[]>(SAMPLE_INTENT_KEYWORDS);
  const [seedBid, setSeedBid] = useState<string>("1.50");

  // New item draft states
  const [newAutoWord, setNewAutoWord] = useState("");
  const [newAutoClicks, setNewAutoClicks] = useState("5");
  const [newAutoOrders, setNewAutoOrders] = useState("1");
  const [newAutoSpend, setNewAutoSpend] = useState("3.50");

  const [newIntentWord, setNewIntentWord] = useState("");
  const [newIntentMatchType, setNewIntentMatchType] = useState<"EXACT" | "PHRASE" | "BROAD">("EXACT");

  // Success indicator
  const [isCopied, setIsCopied] = useState(false);

  // Parse stats from uploaded sheet for quick preview metrics
  const spreadsheetStats = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    let potentialSearchTerms = 0;
    let potentialManualIntents = 0;
    
    rows.forEach(r => {
      potentialSearchTerms += r.searchTerms?.length || 0;
      if (r.matchType && r.matchType !== "Targeting" && r.targeting && r.targeting !== "*") {
        const isAsin = /^[A-Z0-9]{10}$/i.test(r.targeting.trim());
        if (!isAsin) {
          potentialManualIntents++;
        }
      }
    });

    return { potentialSearchTerms, potentialManualIntents };
  }, [rows]);

  // Handler: Parse and load real customer search terms & active targets from the uploaded spreadsheet
  const handleImportFromSpreadsheet = () => {
    const extractedAuto: AutoSearchTerm[] = [];
    const extractedIntent: IntentKeyword[] = [];
    const seenQueries = new Set<string>();
    const seenIntents = new Set<string>();

    rows.forEach(row => {
      // 1. Extract customer-searched terms (Auto-targeting keyword suggestions)
      if (row.searchTerms && row.searchTerms.length > 0) {
        row.searchTerms.forEach(st => {
          const key = normalize(st.term);
          if (!seenQueries.has(key) && st.term.trim()) {
            seenQueries.add(key);
            extractedAuto.push({
              keyword: st.term,
              clicks: st.clicks,
              orders: st.orders,
              spend: st.spend
            });
          }
        });
      }

      // 2. Extract active targeted manual campaign keywords (deduplication target index)
      if (row.matchType && row.matchType !== "Targeting" && row.targeting && row.targeting !== "*") {
        const isAsin = /^[A-Z0-9]{10}$/i.test(row.targeting.trim());
        if (!isAsin) {
          const key = `${normalize(row.targeting)}|||${row.matchType}`;
          if (!seenIntents.has(key)) {
            seenIntents.add(key);
            extractedIntent.push({
              keyword: row.targeting,
              matchType: row.matchType.toUpperCase() as "EXACT" | "PHRASE" | "BROAD"
            });
          }
        }
      }
    });

    // Overwrite the local lists with extracted live data
    setAutoTerms(extractedAuto.length > 0 ? extractedAuto : SAMPLE_AUTO_SEARCH_TERMS);
    setIntentKws(extractedIntent.length > 0 ? extractedIntent : SAMPLE_INTENT_KEYWORDS);
    setImportStats({
      termsExtracted: extractedAuto.length,
      intentsExtracted: extractedIntent.length
    });
    setDataSource("spreadsheet");
  };

  const handleResetToSandbox = () => {
    setAutoTerms(SAMPLE_AUTO_SEARCH_TERMS);
    setIntentKws(SAMPLE_INTENT_KEYWORDS);
    setImportStats(null);
    setDataSource("sandbox");
  };

  // Calculate results on the fly
  const harvestKeywords = useMemo(() => {
    const seedBidNum = parseFloat(seedBid) || 1.50;
    return getNewHarvestKeywords(autoTerms, intentKws, seedBidNum);
  }, [autoTerms, intentKws, seedBid]);

  // Set of active intents for highlight lookup
  const intentNormalizedSet = useMemo(() => {
    return new Set(intentKws.map(i => normalize(i.keyword)));
  }, [intentKws]);

  const addAutoRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAutoWord.trim()) return;
    const clicks = parseInt(newAutoClicks) || 0;
    const orders = parseInt(newAutoOrders) || 0;
    const spend = parseFloat(newAutoSpend) || 0.0;
    setAutoTerms([
      ...autoTerms,
      {
        keyword: newAutoWord.trim(),
        clicks: Math.max(0, clicks),
        orders: Math.max(0, orders),
        spend: Math.max(0, spend)
      }
    ]);
    setNewAutoWord("");
    setNewAutoClicks("5");
    setNewAutoOrders("1");
    setNewAutoSpend("3.50");
  };

  const addIntentRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIntentWord.trim()) return;
    setIntentKws([
      ...intentKws,
      {
        keyword: newIntentWord.trim(),
        matchType: newIntentMatchType
      }
    ]);
    setNewIntentWord("");
  };

  const removeAutoRow = (index: number) => {
    setAutoTerms(autoTerms.filter((_, i) => i !== index));
  };

  const removeIntentRow = (index: number) => {
    setIntentKws(intentKws.filter((_, i) => i !== index));
  };

  const handleCopyResults = () => {
    if (harvestKeywords.length === 0) return;
    
    // Format as Tab Separated Bulk Sheet format for instant Amazon paste-ability
    const headers = "Keyword\tMatch Type\tBidding Seed Override\tCampaign Type";
    const rowsText = harvestKeywords.map(k => 
      `${k.keyword}\t${k.matchType}\t$${k.bid.toFixed(2)}\tManual Intent Extraction`
    ).join("\n");

    navigator.clipboard.writeText(`${headers}\n${rowsText}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="intent-dedup-view">
      
      {/* Visual Identity Hero Card */}
      <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 shadow-xs relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-5 pointer-events-none bg-gradient-to-l from-emerald-500 to-transparent"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl text-left">
            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase rounded tracking-wider">
              WesBid Core Utility Layer
            </span>
            <h2 className="text-xl font-bold tracking-tight">Intent Dedup & Seed Bidding Filter</h2>
            <p className="text-xs text-slate-350 leading-relaxed">
              Maintains clean campaign guardrails by verifying raw auto search query streams against your active targeted manual intent pools under exact normalization constraints. Returns unique, harvestable high-intent parameters instantly without target duplication risk.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 p-3 rounded-lg border border-slate-750 shrink-0 self-start md:self-auto font-mono">
            <FolderSync className="w-5 h-5 text-emerald-400 animate-spin-slow" />
            <div className="text-left select-none">
              <div className="text-[9px] text-slate-400">Match Accuracy Filter</div>
              <div className="text-xs font-extrabold text-white">Unicode Deduplication</div>
            </div>
          </div>
        </div>

        {/* Visual pipeline representation */}
        <div className="hidden sm:inline-flex items-center gap-3 mt-6 pt-5 border-t border-slate-800 text-[10px] font-mono text-slate-400">
          <span>Auto Campaign Candidates</span>
          <span className="text-slate-600">→</span>
          <span className="text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-500/20">Normalize Process</span>
          <span className="text-slate-600">→</span>
          <span className="text-rose-400 font-bold bg-rose-400/10 px-2 py-0.5 rounded border border-rose-500/20">Check Existing Manual Set</span>
          <span className="text-slate-600">→</span>
          <span className="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Safe Harvest Output
          </span>
        </div>
      </div>

      {/* Spreadsheet Integration & Status Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-3xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3 text-left">
          <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${dataSource === "spreadsheet" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-50 text-slate-500 border border-slate-100"}`}>
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <span className="flex items-center gap-1.5 leading-none mb-1">
              <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                dataSource === "spreadsheet" 
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200/50" 
                  : "bg-amber-100/80 text-amber-900 border border-amber-200/40"
              }`}>
                {dataSource === "spreadsheet" ? "Live Spreadsheet Mode" : "Sandbox Playground Mode"}
              </span>

              {rows.length > 0 && dataSource === "sandbox" && (
                <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-150 px-1.5 py-0.5 rounded animate-pulse">
                  Unloaded Report Available
                </span>
              )}
            </span>

            <h3 className="text-xs font-bold text-slate-900">
              {dataSource === "spreadsheet" 
                ? `Active Data Feed: "${importStats?.termsExtracted || 0}" search queries extracted & checkable`
                : "Using Default Interactive Sandbox Dataset"
              }
            </h3>
            
            <p className="text-[11px] text-slate-500 mt-0.5 max-w-2xl">
              {rows.length > 0 
                ? `Your uploaded report contains ${spreadsheetStats?.potentialSearchTerms || 0} customer search terms and ${spreadsheetStats?.potentialManualIntents || 0} active manual bid targets. Push the trigger below to ingest and dedup this live dataset.`
                : "Upload an Amazon Targeting or Search Term Report CSV to the dropzone at any time. WesBid will extract active bids vs. search query histories to automate extraction and deduplication instantly."
              }
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 self-stretch md:self-auto">
          {rows.length > 0 ? (
            <>
              {dataSource === "spreadsheet" ? (
                <button
                  type="button"
                  onClick={handleResetToSandbox}
                  className="px-3 py-2 text-[11px] font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-55 bg-slate-100 border border-slate-200 rounded-lg transition-all cursor-pointer select-none"
                >
                  Reset to Sandbox
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleImportFromSpreadsheet}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-[11px] font-black text-white rounded-lg transition-all shadow-3xs cursor-pointer select-none ${
                  dataSource === "spreadsheet"
                    ? "bg-emerald-600 hover:bg-emerald-700 hover:shadow-xs"
                    : "bg-indigo-650 hover:bg-indigo-700 hover:shadow-xs bg-indigo-600 text-white"
                }`}
              >
                <span>{dataSource === "spreadsheet" ? "⚡ Re-Sync Excel Terms" : "⚡ Load Active Spreadsheet Data"}</span>
              </button>
            </>
          ) : (
            <div className="text-[10px] text-slate-400 bg-slate-50 border border-slate-200/60 px-3 py-2 rounded-lg italic font-medium">
              Sheet upload inactive. Import a file on the main table to unlock.
            </div>
          )}
        </div>
      </div>

      {/* Main configuration grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Auto Streams inputs & Active Targeted Pool */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Section 1: Auto Search Queries Stream */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-3xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-emerald-600" />
                  Auto Search Campaign Queries
                </h3>
                <p className="text-[10px] text-slate-500">
                  Target candidate streams feeding from search term reports
                </p>
              </div>

              {/* Seed bid controllers */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
                <span className="text-slate-400 font-semibold uppercase text-[9px]">Default Seed Bid</span>
                <div className="flex items-center focus-within:ring-1 focus-within:ring-emerald-500 rounded bg-white border border-slate-200 pl-1">
                  <span className="text-slate-400 text-[11px] font-mono">$</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0.10"
                    max="5.00"
                    value={seedBid}
                    onChange={(e) => setSeedBid(e.target.value)}
                    className="w-14 px-1 py-0.5 text-xs font-bold text-slate-800 font-mono outline-none border-none text-right"
                  />
                </div>
              </div>
            </div>

            {/* Form inline row adder */}
            <form onSubmit={addAutoRow} className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-150">
              <div className="sm:col-span-5 space-y-1">
                <label className="text-[9px] uppercase font-bold text-slate-405 text-slate-500">Query Phase</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. magnetic pack latch cord"
                  value={newAutoWord}
                  onChange={(e) => setNewAutoWord(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-250 rounded-md outline-none focus:ring-1 focus:ring-emerald-500 font-medium placeholder-slate-400"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[9px] uppercase font-bold text-slate-405 text-slate-500">Clicks</label>
                <input
                  type="number"
                  min="0"
                  value={newAutoClicks}
                  onChange={(e) => setNewAutoClicks(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-250 rounded-md outline-none focus:ring-1 focus:ring-emerald-500 font-bold font-mono"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[9px] uppercase font-bold text-slate-405 text-slate-500">Orders</label>
                <input
                  type="number"
                  min="0"
                  value={newAutoOrders}
                  onChange={(e) => setNewAutoOrders(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-250 rounded-md outline-none focus:ring-1 focus:ring-emerald-500 font-bold font-mono"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[9px] uppercase font-bold text-slate-405 text-slate-500">Spend</label>
                <input
                  type="number"
                  step="0.10"
                  min="0"
                  value={newAutoSpend}
                  onChange={(e) => setNewAutoSpend(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-250 rounded-md outline-none focus:ring-1 focus:ring-emerald-500 font-bold font-mono"
                />
              </div>

              <div className="sm:col-span-1 flex items-end">
                <button
                  type="submit"
                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md text-xs shadow-xs cursor-pointer transition select-none flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* List Table of Auto Terms */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-xs font-sans">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200">
                    <th className="p-2.5">Auto Query String</th>
                    <th className="p-2.5 text-center">Clicks</th>
                    <th className="p-2.5 text-center">Orders</th>
                    <th className="p-2.5 text-right">Spend</th>
                    <th className="p-2.5 text-center">Normalization check</th>
                    <th className="p-2.5 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {autoTerms.map((row, idx) => {
                    const normalizedCandidate = normalize(row.keyword);
                    const isDup = intentNormalizedSet.has(normalizedCandidate);
                    const hasSignal = row.clicks >= 1 || row.orders >= 1;
                    
                    return (
                      <tr 
                        key={idx} 
                        className={`hover:bg-slate-50/50 transition font-medium ${
                          isDup 
                            ? "bg-amber-50/30 text-slate-500 italic" 
                            : !hasSignal 
                              ? "bg-slate-50 text-slate-400 text-slate-350" 
                              : "text-slate-800"
                        }`}
                      >
                        <td className="p-2.5 font-bold">
                          {row.keyword}
                        </td>
                        <td className="p-2.5 text-center font-mono">{row.clicks}</td>
                        <td className="p-2.5 text-center font-mono">{row.orders}</td>
                        <td className="p-2.5 text-right font-mono text-slate-500">${row.spend.toFixed(2)}</td>
                        <td className="p-2.5 text-center">
                          {isDup ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80">
                              Duplicate - Filtered
                            </span>
                          ) : !hasSignal ? (
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 font-semibold">
                              Weak Signal
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80">
                              Passed - Safe Target
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <button
                            type="button"
                            onClick={() => removeAutoRow(idx)}
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Active Core Intent targeted Campaign Keywords */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-3xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Active Intent Pool (De-duplicate Matrix)
              </h3>
              <p className="text-[10px] text-slate-500">
                Core Manual matching phrases already active in current PPC Campaigns
              </p>
            </div>

            {/* Add intent row form */}
            <form onSubmit={addIntentRow} className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-150">
              <div className="sm:col-span-7 space-y-1">
                <label className="text-[9px] uppercase font-bold text-slate-405 text-slate-400">Manual Intent Phrase</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. delivery signs for packages"
                  value={newIntentWord}
                  onChange={(e) => setNewIntentWord(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-250 rounded-md outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
                />
              </div>

              <div className="sm:col-span-4 space-y-1">
                <label className="text-[9px] uppercase font-bold text-slate-405 text-slate-405">Match Type</label>
                <select
                  value={newIntentMatchType}
                  onChange={(e: any) => setNewIntentMatchType(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-250 rounded-md outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700"
                >
                  <option value="EXACT">EXACT</option>
                  <option value="PHRASE">PHRASE</option>
                  <option value="BROAD">BROAD</option>
                </select>
              </div>

              <div className="sm:col-span-1 flex items-end">
                <button
                  type="submit"
                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md text-xs shadow-xs cursor-pointer transition select-none flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* List active targeted intent keywords */}
            <div className="flex flex-wrap gap-2.5 p-1">
              {intentKws.map((kw, i) => (
                <div 
                  key={i} 
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-800 rounded-lg border border-slate-200/80 font-semibold text-xs transition hover:bg-slate-150 hover:border-slate-300 relative group"
                >
                  <span className="font-mono text-[9px] uppercase font-black text-slate-400">
                    [{kw.matchType}]
                  </span>
                  <span className="font-bold">{kw.keyword}</span>
                  <button
                    type="button"
                    onClick={() => removeIntentRow(i)}
                    className="p-0.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                  >
                    <Trash2 className="w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: Clean Harvest Output Receipt & Export panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white border border-slate-900 rounded-xl p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  Safe Harvest Output ({harvestKeywords.length})
                </h4>
                <p className="text-[9px] text-slate-400 font-mono">
                  No duplicates guaranteed
                </p>
              </div>
              
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-500/15">
                Ready to Scale
              </span>
            </div>

            {harvestKeywords.length === 0 ? (
              <div className="bg-slate-900 p-8 text-center rounded-lg border border-slate-850 border-dashed text-slate-400 space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <h5 className="text-xs font-bold text-slate-200">No Harvestable Segments</h5>
                <p className="text-[10px] text-slate-450 leading-relaxed text-slate-400">
                  Either all candidates are already targeted in your active pool, or signals are too low to clear filters. Add valid Auto rows or check overlap!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {harvestKeywords.map((kw, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0.98, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg flex items-center justify-between font-sans text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-950 border border-indigo-900/40 px-1.5 py-0.5 rounded">
                          {kw.matchType}
                        </span>
                        <div className="font-extrabold text-slate-200 text-xs">
                          {kw.keyword}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[8px] uppercase text-slate-450 font-bold block text-slate-400">
                          Suggested Seed
                        </span>
                        <span className="text-xs font-black text-emerald-400 font-mono">
                          ${kw.bid.toFixed(2)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Simulated Bulk Sheet format output info box */}
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-850 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500 border-b border-slate-900 pb-1.5 font-mono">
                    <span className="flex items-center gap-1"><FileSpreadsheet className="w-3 h-3" /> Tab-delimited Sheet</span>
                    <span>Ready</span>
                  </div>
                  <pre className="text-[9px] font-mono text-emerald-350 bg-slate-900 p-2 rounded leading-loose select-all overflow-x-auto text-emerald-350">
{`Keyword\tMatch Type\tBidding Seed Override\tCampaign Type
${harvestKeywords.map(k => `${k.keyword}\t${k.matchType}\t$${k.bid.toFixed(2)}\tManual Intent Extraction`).join("\n")}`}
                  </pre>
                </div>

                <button
                  type="button"
                  onClick={handleCopyResults}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 font-bold rounded-lg text-xs transition cursor-pointer select-none flex items-center justify-center gap-1.5 text-white shadow-md shadow-emerald-950/20"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4.5 h-4.5" />
                      <span>Copied Tab-deliminated Data!</span>
                    </>
                  ) : (
                    <>
                      <ClipboardCopy className="w-4 h-4" />
                      <span>Copy Bulk-Sheet Import Code</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
