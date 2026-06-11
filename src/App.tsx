/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { 
  SlidersHorizontal, 
  Sparkle,
  Sparkles, 
  RotateCcw, 
  LayoutDashboard, 
  UploadCloud, 
  FileSpreadsheet, 
  TrendingUp, 
  Download, 
  X, 
  Info,
  Check,
  AlertTriangle,
  RotateCw,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { AmazonPpcRow, BidRecommendation, OptimizerConfig, StrategyPreset, StrategyDefinition } from "./types";
import { STRATEGY_PRESETS, calculateRowBid, calculateScenarioImpact } from "./lib/bidEngine";
import { convertToCsv } from "./lib/parser";

// Component imports
import UploadDropzone from "./components/UploadDropzone";
import BidTable from "./components/BidTable";
import SummaryPanel from "./components/SummaryPanel";
import AssistantInsight from "./components/AssistantInsight";

export default function App() {
  // PPC Data States
  const [ppcRows, setPpcRows] = useState<AmazonPpcRow[]>([]);
  const [filename, setFilename] = useState<string>("");

  // Preset Strategy State
  const [activeStrategy, setActiveStrategy] = useState<StrategyPreset>("BALANCED");

  // Slider Configurations (dynamic, reactive copy of strategy presets)
  const [config, setConfig] = useState<OptimizerConfig>(STRATEGY_PRESETS.BALANCED.config);

  // Manual User overrides (Maps rowId -> manual suggested bid value)
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"TABLE" | "SUMMARY" | "COPILOT">("TABLE");

  // Sidebar open/collapse state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Auto-collapse sidebar on smaller screens on mount to maximize workspace
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, []);

  // Handle Strategic Preset Change
  const applyPreset = (preset: StrategyPreset) => {
    setActiveStrategy(preset);
    setConfig(STRATEGY_PRESETS[preset].config);
    setOverrides({}); // Reset overrides so strategic values show cleanly
  };

  // Callback: Data loaded from Dropzone
  const handleDataLoaded = (rows: AmazonPpcRow[], name: string) => {
    setPpcRows(rows);
    setFilename(name);
    setOverrides({});
    setActiveTab("TABLE");
  };

  // Re-calculate recommended bids and user overrides on-the-fly
  const recommendations = useMemo(() => {
    const recs: Record<string, BidRecommendation> = {};
    ppcRows.forEach(row => {
      const rec = calculateRowBid(row, config);

      if (overrides[row.id] !== undefined) {
        const manualBid = overrides[row.id];
        const curBid = row.currentBid || row.cpc || 1.00;

        let action: "SCALE" | "REDUCE" | "HOLD" = "HOLD";
        let reason = `Target manually adjusted from $${curBid.toFixed(2)} to $${manualBid.toFixed(2)}.`;

        if (manualBid > curBid) {
          action = "SCALE";
        } else if (manualBid < curBid) {
          action = "REDUCE";
        }

        recs[row.id] = {
          ...rec,
          suggestedBid: manualBid,
          action,
          reason,
          confidence: "High", // Manual override represents active human intelligence
          isOverridden: true
        };
      } else {
        recs[row.id] = rec;
      }
    });
    return recs;
  }, [ppcRows, config, overrides]);

  // Re-calculate aggregate scenario impacts list
  const impact = useMemo(() => {
    return calculateScenarioImpact(ppcRows, recommendations);
  }, [ppcRows, recommendations]);

  // Handler: Manual row bid override
  const handleBidOverride = (rowId: string, newBid: number) => {
    setOverrides(prev => ({
      ...prev,
      [rowId]: Math.max(0.01, newBid) // floor safeguard
    }));
  };

  const handleResetOverride = (rowId: string) => {
    setOverrides(prev => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  };

  const clearAllOverrides = () => {
    setOverrides({});
  };

  // Handler: Bulk row sandbox modifier
  const handleBulkOverride = (rowIds: string[], multiplier: number) => {
    setOverrides(prev => {
      const next = { ...prev };
      rowIds.forEach(id => {
        const row = ppcRows.find(r => r.id === id);
        if (row) {
          const currentRecBid = recommendations[id]?.suggestedBid || row.currentBid || row.cpc || 1.00;
          next[id] = Number(Math.max(0.02, currentRecBid * multiplier).toFixed(2));
        }
      });
      return next;
    });
  };

  const handleBulkSetAction = (rowIds: string[], action: "SCALE" | "REDUCE" | "HOLD") => {
    setOverrides(prev => {
      const next = { ...prev };
      rowIds.forEach(id => {
        const row = ppcRows.find(r => r.id === id);
        if (row) {
          const origBid = row.currentBid || row.cpc || 1.00;
          if (action === "SCALE") {
            next[id] = Number((origBid * 1.25).toFixed(2));
          } else if (action === "REDUCE") {
            next[id] = Number((origBid * 0.70).toFixed(2));
          } else {
            next[id] = Number(origBid.toFixed(2));
          }
        }
      });
      return next;
    });
  };

  // Trigger spreadsheet downloader
  const downloadReport = (mode: "analytical" | "amazon_bulk") => {
    const csvContent = convertToCsv(ppcRows, recommendations, mode);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const timestamp = new Date().toISOString().slice(0, 10);
    const namePrefix = mode === "amazon_bulk" ? "amazon_bulk_upload" : "wesbid_analytical_report";
    link.setAttribute("download", `${namePrefix}_${timestamp}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const leaveDataset = () => {
    setPpcRows([]);
    setFilename("");
    setOverrides({});
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans" id="app-container">
      {/* Prime Header navigation block */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <img 
            src="/favicon_1781186553198.jpg" 
            alt="WesBid Logo" 
            className="h-9 w-9 rounded-lg object-cover border border-slate-700/60 shadow-xs"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight leading-none">WesBid Optimizer</h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide mt-1">Amazon PPC Bidding & Simulation Lab</p>
          </div>
        </div>

        {ppcRows.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] bg-slate-800 text-slate-300 font-semibold px-2.5 py-1 rounded-md border border-slate-700 select-none truncate max-w-44 md:max-w-64">
              📄 {filename}
            </span>
            <button
              onClick={leaveDataset}
              className="p-1 px-2.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md text-[10px] font-semibold border border-transparent hover:border-slate-700 transition cursor-pointer"
              title="Close current file"
            >
              Clear File
            </button>
          </div>
        )}
      </header>

      {/* Main layout routing switch */}
      {ppcRows.length === 0 ? (
        /* State A: EMPTY DATASET (Uploader Workspace) */
        <main className="max-w-7xl mx-auto px-6 py-12">
          <UploadDropzone onDataLoaded={handleDataLoaded} />
        </main>
      ) : (
        /* State B: ACTIVE SIMULATION WORKSPACE */
        <main className="max-w-7xl mx-auto px-6 py-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            
            {/* LEFT COLUMN: SIMULATOR FINE-TUNING SLIDERS */}
            {isSidebarOpen && (
              <section className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-6 lg:sticky lg:top-24 transition-all">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                    Formula Tuning
                  </h2>
                  
                  <div className="flex items-center gap-2">
                    {Object.keys(overrides).length > 0 && (
                      <button
                        onClick={clearAllOverrides}
                        className="text-[10px] font-semibold text-amber-600 hover:text-amber-700 underline flex items-center gap-1 cursor-pointer"
                        title="Purge manual overrides"
                      >
                        Reset ({Object.keys(overrides).length})
                      </button>
                    )}
                    <button
                      onClick={() => setIsSidebarOpen(false)}
                      className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded transition cursor-pointer"
                      title="Collapse Formula Tuning Menu"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              {/* Strategy Preset picker pills */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Optimization Preset</span>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg">
                  {(["CONSERVATIVE", "BALANCED", "AGGRESSIVE", "HARVEST"] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => applyPreset(p)}
                      className={`py-2 text-[10px] font-bold rounded-md select-none transition cursor-pointer ${
                        activeStrategy === p 
                          ? "bg-slate-900 text-white shadow-xs" 
                          : "text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {p === "CONSERVATIVE" ? "Conservative" : p === "BALANCED" ? "Balanced" : p === "AGGRESSIVE" ? "Aggressive" : "Harvest"}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 leading-normal bg-slate-50 p-2 border border-slate-100 rounded italic">
                  {STRATEGY_PRESETS[activeStrategy].description}
                </p>
              </div>

              {/* Slider variables */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Coefficients</span>

                {/* 1. Target ACOS slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Target ACOS</span>
                    <span className="font-bold text-slate-950 font-mono">{config.targetAcos}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="90"
                    step="1"
                    value={config.targetAcos}
                    onChange={(e) => setConfig(prev => ({ ...prev, targetAcos: Number(e.target.value) }))}
                    className="w-full accent-brand cursor-ew-resize h-1.5 bg-slate-100 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-medium">
                    <span>Conservative (5%)</span>
                    <span>Aggressive (90%)</span>
                  </div>
                </div>

                {/* 2. Min Clicks threshold slider */}
                <div className="space-y-1.5 pt-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Learning Phase Clicks</span>
                    <span className="font-bold text-slate-950 font-mono">{config.minClicks} clk</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="1"
                    value={config.minClicks}
                    onChange={(e) => setConfig(prev => ({ ...prev, minClicks: Number(e.target.value) }))}
                    className="w-full accent-brand cursor-ew-resize h-1.5 bg-slate-100 rounded-lg appearance-none"
                  />
                  <p className="text-[9px] text-slate-400 leading-normal">
                    Keywords under this limit holding 0 orders are protected from immediate pruning.
                  </p>
                </div>

                {/* 3. Bid Dampening coefficient slider */}
                <div className="space-y-1.5 pt-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Bid Dampening Shift</span>
                    <span className="font-bold text-slate-950 font-mono">{(config.dampening * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={config.dampening * 100}
                    onChange={(e) => setConfig(prev => ({ ...prev, dampening: Number(e.target.value) / 100 }))}
                    className="w-full accent-brand cursor-ew-resize h-1.5 bg-slate-100 rounded-lg appearance-none"
                  />
                  <p className="text-[9px] text-slate-400 leading-normal">
                    Protects you against extreme volatile bid swings (100% applies formula fully, lower dampening smooths changes).
                  </p>
                </div>

                {/* 4. Bleeder Limits sliders */}
                <div className="space-y-3.5 pt-3 border-t border-dashed border-slate-100">
                  <div className="flex justify-between text-xs font-semibold text-slate-755 text-rose-800">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Bleeder Flags
                    </span>
                  </div>

                  {/* Clicks */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                      <span>Clicks limit before penalty</span>
                      <span className="font-bold font-mono text-slate-900">{config.bleederClicks} clicks</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="30"
                      step="1"
                      value={config.bleederClicks}
                      onChange={(e) => setConfig(prev => ({ ...prev, bleederClicks: Number(e.target.value) }))}
                      className="w-full accent-rose-600 cursor-ew-resize h-1 bg-slate-100 rounded-lg appearance-none"
                    />
                  </div>

                  {/* Penalty % */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                      <span>Penalty Bid Reduction</span>
                      <span className="font-bold font-mono text-slate-900">-{config.bleederReduction}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="80"
                      step="5"
                      value={config.bleederReduction}
                      onChange={(e) => setConfig(prev => ({ ...prev, bleederReduction: Number(e.target.value) }))}
                      className="w-full accent-rose-600 cursor-ew-resize h-1 bg-slate-100 rounded-lg appearance-none"
                    />
                  </div>
                </div>

                {/* 5. Pricing Safeguards Min/Max Bids */}
                <div className="space-y-3 pt-3 border-t border-dashed border-slate-100">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block">Bidding Caps Gate</span>
                  
                  {/* Min Bid */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>Minimum (Floor) Bid</span>
                      <span className="font-sans font-bold text-slate-900">${config.minBid.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.02"
                      max="1.00"
                      step="0.01"
                      value={config.minBid}
                      onChange={(e) => setConfig(prev => ({ ...prev, minBid: Number(e.target.value) }))}
                      className="w-full accent-slate-800 cursor-ew-resize h-1 bg-slate-100 rounded-lg appearance-none"
                    />
                  </div>

                  {/* Max Bid */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>Maximum (Ceiling) Bid</span>
                      <span className="font-sans font-bold text-slate-900">${config.maxBid.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="1.00"
                      max="10.00"
                      step="0.10"
                      value={config.maxBid}
                      onChange={(e) => setConfig(prev => ({ ...prev, maxBid: Number(e.target.value) }))}
                      className="w-full accent-slate-800 cursor-ew-resize h-1 bg-slate-100 rounded-lg appearance-none"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

            {/* RIGHT COLUMN: TABS PANEL (TABLE | SUMMARY | COPILOT) */}
            <section className={`${isSidebarOpen ? "lg:col-span-3" : "lg:col-span-4"} space-y-6 transition-all`}>
              
              {/* Top Navigation Row / Core Action Downloads */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
                
                {/* Mode Selector Tabs */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  {!isSidebarOpen && (
                    <button
                      onClick={() => setIsSidebarOpen(true)}
                      className="px-3.5 py-1.5 bg-brand/10 text-brand hover:bg-brand hover:text-white border border-brand/20 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs select-none shrink-0"
                      title="Expand Formula Tuning Controls"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Formula Tuning</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  
                  <div className="flex gap-1.5 p-1 bg-slate-100 rounded-lg w-full md:w-auto overflow-x-auto">
                    <button
                      onClick={() => setActiveTab("TABLE")}
                      className={`flex items-center gap-1.5 px-4.5 py-2 text-xs font-semibold rounded-md transition select-none cursor-pointer ${
                        activeTab === "TABLE" 
                          ? "bg-white text-slate-900 shadow-sm font-bold" 
                          : "text-slate-600 hover:bg-slate-200/50"
                      }`}
                    >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                    Bidding Cockpit
                  </button>

                  <button
                    onClick={() => setActiveTab("SUMMARY")}
                    className={`flex items-center gap-1.5 px-4.5 py-2 text-xs font-semibold rounded-md transition select-none cursor-pointer ${
                      activeTab === "SUMMARY" 
                        ? "bg-white text-slate-900 shadow-sm font-bold" 
                        : "text-slate-600 hover:bg-slate-200/50"
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
                    Analytics Delta
                  </button>

                  <button
                    onClick={() => setActiveTab("COPILOT")}
                    className={`flex items-center gap-1.5 px-4.5 py-2 text-xs font-semibold rounded-md transition select-none cursor-pointer ${
                      activeTab === "COPILOT" 
                        ? "bg-white text-slate-900 shadow-sm font-bold" 
                        : "text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-brand animate-pulse" />
                    PPC Co-pilot AI
                  </button>
                </div>
              </div>

                {/* Bulk Exports Buttons */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <button
                    onClick={() => downloadReport("analytical")}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer select-none"
                    id="btn-export-analyst"
                    title="Includes all analytics markers, current metrics, and suggest comments"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Export Analyst View
                  </button>

                  <button
                    onClick={() => downloadReport("amazon_bulk")}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4.5 py-2 bg-brand hover:bg-brand-hover text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow transition cursor-pointer select-none"
                    id="btn-export-bulk"
                    title="Formatted specifically as standard Amazon Campaign Manager Bulk Sheets template"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Bulk Import file
                  </button>
                </div>
              </div>

              {/* Dynamic Tab Panel Content Area */}
              <div>
                {activeTab === "TABLE" && (
                  <BidTable
                    rows={ppcRows}
                    recommendations={recommendations}
                    onBidOverride={handleBidOverride}
                    onResetOverride={handleResetOverride}
                    onBulkOverride={handleBulkOverride}
                    onBulkSetAction={handleBulkSetAction}
                  />
                )}

                {activeTab === "SUMMARY" && (
                  <SummaryPanel
                    rows={ppcRows}
                    recommendations={recommendations}
                    impact={impact}
                  />
                )}

                {activeTab === "COPILOT" && (
                  <AssistantInsight
                    rows={ppcRows}
                    recommendations={recommendations}
                    activePresetName={STRATEGY_PRESETS[activeStrategy].name}
                    config={config}
                    stats={impact}
                  />
                )}
              </div>

            </section>

          </div>

        </main>
      )}

      {/* Humble Footer */}
      <footer className="mt-16 py-8 border-t border-slate-200/50 bg-white text-center text-xs text-slate-400 font-medium">
        WesBid Optimizer Lab • Purely Client-Side Simulation & Math Processing • Not automated in live campaign managers.
      </footer>
    </div>
  );
}
