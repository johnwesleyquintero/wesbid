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
  Upload,
  X, 
  Info,
  Check,
  AlertTriangle,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Compass,
  FolderSync,
  Calculator,
  Clipboard,
  Sun,
  Moon
} from "lucide-react";
import { AmazonPpcRow, BidRecommendation, OptimizerConfig, StrategyPreset, StrategyDefinition } from "./types";
import { STRATEGY_PRESETS, calculateRowBid, calculateScenarioImpact } from "./lib/bidEngine";
import { convertToCsv } from "./lib/parser";

// Component imports
import UploadDropzone from "./components/UploadDropzone";
import BidTable from "./components/BidTable";
import SummaryPanel from "./components/SummaryPanel";
import AssistantInsight from "./components/AssistantInsight";
import NicheDiscovery from "./components/NicheDiscovery";
import IntentHarvester from "./components/IntentHarvester";
import ManualCalculator from "./components/ManualCalculator";
import QuickAcosCalculator from "./components/QuickAcosCalculator";

export default function App() {
  // Theme selection state (light / dark)
  const [theme, setTheme] = useState<"light" | "dark">((() => {
    try {
      const saved = localStorage.getItem("wesbid_theme");
      if (saved === "light" || saved === "dark") return saved;
      return "light";
    } catch (e) {
      return "light";
    }
  })());

  useEffect(() => {
    try {
      localStorage.setItem("wesbid_theme", theme);
      const root = window.document.documentElement;
      if (theme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    } catch (e) {
      console.warn("Could not save theme:", e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  // PPC Data States
  const [ppcRows, setPpcRows] = useState<AmazonPpcRow[]>(() => {
    try {
      const saved = localStorage.getItem("wesbid_ppc_rows");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn("Could not load ppc_rows from localStorage:", e);
      return [];
    }
  });
  const [filename, setFilename] = useState<string>(() => {
    return localStorage.getItem("wesbid_filename") || "";
  });
  const [rawRecordsCount, setRawRecordsCount] = useState<number>(() => {
    const saved = localStorage.getItem("wesbid_raw_count");
    return saved ? Number(saved) : 0;
  });
  const [showDedupeAlert, setShowDedupeAlert] = useState<boolean>(true);

  // Compute detected report layout type
  const reportType = useMemo(() => {
    if (ppcRows.length === 0) return "";
    const hasSearchTerms = ppcRows.some(row => row.searchTerms && row.searchTerms.length > 0);
    return hasSearchTerms ? "Amazon Search Term Report" : "Amazon Targeting Report";
  }, [ppcRows]);

  // Preset Strategy State
  const [activeStrategy, setActiveStrategy] = useState<StrategyPreset>(() => {
    return (localStorage.getItem("wesbid_active_strategy") as StrategyPreset) || "BALANCED";
  });

  // Slider Configurations (dynamic, reactive copy of strategy presets)
  const [config, setConfig] = useState<OptimizerConfig>(() => {
    try {
      const saved = localStorage.getItem("wesbid_config");
      return saved ? JSON.parse(saved) : STRATEGY_PRESETS.BALANCED.config;
    } catch (e) {
      console.warn("Could not load config from localStorage, falling back to BALANCED:", e);
      return STRATEGY_PRESETS.BALANCED.config;
    }
  });

  // Manual User overrides (Maps rowId -> manual suggested bid value)
  const [overrides, setOverrides] = useState<Record<string, number>>((() => {
    try {
      const saved = localStorage.getItem("wesbid_overrides");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn("Could not load overrides from localStorage:", e);
      return {};
    }
  }));

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"TABLE" | "SUMMARY" | "COPILOT" | "NICHES" | "DEDUP" | "CALCULATOR" | "QUICK_CALC">("TABLE");

  // Sidebar open/collapse state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Configuration JSON profile state
  const [importStatus, setImportStatus] = useState<{ type: "success" | "error" | null; message: string }>({ type: null, message: "" });

  const handleExportConfig = () => {
    try {
      const exportObject = {
        meta: {
          app: "WesBid Premium Optimizer",
          version: "3.0",
          exportedAt: new Date().toISOString(),
          activeStrategyPreset: activeStrategy
        },
        config: config
      };
      
      const jsonString = JSON.stringify(exportObject, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `wesbid-tuning-${activeStrategy.toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Failed to export configuration: " + (e as Error).message);
    }
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        
        let loadedConfig: Partial<OptimizerConfig> | null = null;
        if (parsed && parsed.config) {
          loadedConfig = parsed.config;
        } else if (parsed && (typeof parsed.targetAcos === "number" || typeof parsed.minClicks === "number")) {
          loadedConfig = parsed;
        }

        if (!loadedConfig) {
          throw new Error("Invalid schema structure. No configuration profiles found.");
        }

        const cleanConfig: OptimizerConfig = {
          targetAcos: typeof loadedConfig.targetAcos === "number" ? Math.max(5, Math.min(120, loadedConfig.targetAcos)) : config.targetAcos,
          minClicks: typeof loadedConfig.minClicks === "number" ? Math.max(1, Math.min(100, loadedConfig.minClicks)) : config.minClicks,
          minBid: typeof loadedConfig.minBid === "number" ? Math.max(0.01, Math.min(5.00, loadedConfig.minBid)) : config.minBid,
          maxBid: typeof loadedConfig.maxBid === "number" ? Math.max(1.00, Math.min(25.00, loadedConfig.maxBid)) : config.maxBid,
          dampening: typeof loadedConfig.dampening === "number" ? Math.max(0.05, Math.min(1.00, loadedConfig.dampening)) : config.dampening,
          bleederClicks: typeof loadedConfig.bleederClicks === "number" ? Math.max(2, Math.min(50, loadedConfig.bleederClicks)) : config.bleederClicks,
          bleederReduction: typeof loadedConfig.bleederReduction === "number" ? Math.max(5, Math.min(95, loadedConfig.bleederReduction)) : config.bleederReduction,
          enableV3: typeof loadedConfig.enableV3 === "boolean" ? loadedConfig.enableV3 : (config.enableV3 ?? true),
          confidenceScale: typeof loadedConfig.confidenceScale === "number" ? Math.max(10, Math.min(100, loadedConfig.confidenceScale)) : (config.confidenceScale ?? 75),
          adaptiveDecay: typeof loadedConfig.adaptiveDecay === "number" ? Math.max(0, Math.min(100, loadedConfig.adaptiveDecay)) : (config.adaptiveDecay ?? 15),
          exactMatchBoost: typeof loadedConfig.exactMatchBoost === "number" ? Math.max(0, Math.min(100, loadedConfig.exactMatchBoost)) : (config.exactMatchBoost ?? 10),
          broadMatchDiscount: typeof loadedConfig.broadMatchDiscount === "number" ? Math.max(0, Math.min(100, loadedConfig.broadMatchDiscount)) : (config.broadMatchDiscount ?? 15),
          tosPlacementBoost: typeof loadedConfig.tosPlacementBoost === "number" ? Math.max(0, Math.min(100, loadedConfig.tosPlacementBoost)) : (config.tosPlacementBoost ?? 15)
        };

        if (parsed.meta?.activeStrategyPreset) {
          setActiveStrategy(parsed.meta.activeStrategyPreset);
        }

        setConfig(cleanConfig);
        setImportStatus({ type: "success", message: "Config profile loaded!" });
        setTimeout(() => setImportStatus({ type: null, message: "" }), 3500);
      } catch (err) {
        setImportStatus({ type: "error", message: `Load failed: ${(err as Error).message}` });
        setTimeout(() => setImportStatus({ type: null, message: "" }), 5000);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Sync state mutations to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("wesbid_ppc_rows", JSON.stringify(ppcRows));
    } catch (e) {
      console.error("Failed to sync ppc_rows to localStorage:", e);
    }
  }, [ppcRows]);

  useEffect(() => {
    localStorage.setItem("wesbid_filename", filename);
  }, [filename]);

  useEffect(() => {
    localStorage.setItem("wesbid_raw_count", rawRecordsCount.toString());
  }, [rawRecordsCount]);

  useEffect(() => {
    localStorage.setItem("wesbid_active_strategy", activeStrategy);
  }, [activeStrategy]);

  useEffect(() => {
    try {
      localStorage.setItem("wesbid_config", JSON.stringify(config));
    } catch (e) {
      console.error("Failed to sync config to localStorage:", e);
    }
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem("wesbid_overrides", JSON.stringify(overrides));
    } catch (e) {
      console.error("Failed to sync overrides to localStorage:", e);
    }
  }, [overrides]);

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
  const handleDataLoaded = (rows: AmazonPpcRow[], name: string, rawCount?: number) => {
    setPpcRows(rows);
    setFilename(name);
    setOverrides({});
    setActiveTab("TABLE");
    setRawRecordsCount(rawCount !== undefined ? rawCount : rows.length);
    setShowDedupeAlert(true);
  };

  // Re-calculate recommended bids and user overrides on-the-fly
  const recommendations = useMemo(() => {
    const recs: Record<string, BidRecommendation> = {};
    
    // Pre-calculate Top Performers Set (Top 10% based on ROAS, only where sales > 0)
    const topPerformersIds = new Set<string>();
    const saleRows = ppcRows
      .filter(r => r.sales > 0 && r.spend >= 0)
      .map(r => {
        const roas = r.spend > 0 ? (r.sales / r.spend) : (r.sales / 0.01);
        return { id: r.id, roas };
      });
    
    saleRows.sort((a, b) => b.roas - a.roas);
    const topCount = Math.ceil(ppcRows.length * 0.10);
    saleRows.slice(0, topCount).forEach(item => {
      topPerformersIds.add(item.id);
    });

    ppcRows.forEach(row => {
      let rec = calculateRowBid(row, config);

      if (overrides[row.id] !== undefined) {
        const rawManualBid = overrides[row.id];
        // Force re-validation: clamp the manual override to current config's min/max bounds
        const manualBid = Math.max(config.minBid, Math.min(config.maxBid, rawManualBid));
        const curBid = row.currentBid || row.cpc || 1.00;

        let action: "SCALE" | "REDUCE" | "HOLD" = "HOLD";
        let reason = "";

        if (manualBid > curBid + 0.005) {
          action = "SCALE";
          reason = `Target manually adjusted from $${curBid.toFixed(2)} to $${manualBid.toFixed(2)}.`;
        } else if (manualBid < curBid - 0.005) {
          action = "REDUCE";
          reason = `Target manually adjusted from $${curBid.toFixed(2)} to $${manualBid.toFixed(2)}.`;
        } else {
          action = "HOLD";
          reason = `Target manually set to match baseline current bid ($${manualBid.toFixed(2)}).`;
        }

        if (manualBid !== rawManualBid) {
          reason += ` (Clamped to current strategy limits [$${config.minBid.toFixed(2)} - $${config.maxBid.toFixed(2)}]).`;
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
        // Automatically apply High-Impact bid scaling for Top Performers where no override exists
        if (topPerformersIds.has(row.id)) {
          const roas = row.spend > 0 ? (row.sales / row.spend) : (row.sales / 0.01);
          
          // Boost suggested bid from base suggested bid by an extra +20% for high-impact scaling
          let boostedBid = rec.suggestedBid * 1.20;
          
          // Clamp to max/min strategy limits
          boostedBid = Math.max(config.minBid, Math.min(config.maxBid, boostedBid));
          
          rec = {
            ...rec,
            suggestedBid: Number(boostedBid.toFixed(2)),
            action: "SCALE",
            reason: `✨ Top Performer (ROAS: ${roas.toFixed(1)}x, Top 10%): High-Impact +20% scaling suggested to aggressively capture premium placements.`,
            confidence: "High"
          };
        }
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

  const handleCurrentBidChange = (rowId: string, newBid: number) => {
    setPpcRows(prev => prev.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          currentBid: Math.max(0.01, newBid)
        };
      }
      return row;
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
    setRawRecordsCount(0);
    setShowDedupeAlert(true);
  };

  const hardResetApp = () => {
    if (window.confirm("Perform a hard factory reset? This will restore raw parameters, purge custom formulas, clear database cache, and wipe manual overrides permanently!")) {
      localStorage.clear();
      setPpcRows([]);
      setFilename("");
      setOverrides({});
      setRawRecordsCount(0);
      setActiveStrategy("BALANCED");
      setConfig(STRATEGY_PRESETS.BALANCED.config);
      setShowDedupeAlert(true);
      setActiveTab("TABLE");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200" id="app-container">
      {/* Prime Header navigation block */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md select-none">
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <img 
            src="/favicon_1781186553198.jpg" 
            alt="WesBid Logo" 
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg object-cover border border-slate-700/60 shadow-xs"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-none">WesBid Optimizer</h1>
            <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium tracking-wide mt-1">Amazon PPC Bidding & Simulation Lab</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
          {/* Custom Theme Selector Switch */}
          <div className="flex items-center bg-slate-950/50 border border-slate-800 p-0.5 rounded-lg select-none shrink-0" id="theme-selector-pill">
            <button
              onClick={() => setTheme("light")}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                theme === "light" 
                  ? "bg-slate-800 text-amber-300 shadow-xs" 
                  : "text-slate-500 hover:text-slate-300"
              }`}
              title="Light Mode"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                theme === "dark" 
                  ? "bg-slate-800 text-indigo-400 shadow-xs" 
                  : "text-slate-500 hover:text-slate-300"
              }`}
              title="Dark Mode"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>

          {ppcRows.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-800 text-slate-300 font-semibold px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md border border-slate-700 select-none text-[9px] sm:text-[10px] truncate max-w-[120px] xs:max-w-[160px] sm:max-w-44 md:max-w-64">
              <span className="text-slate-400">📄</span>
              <span className="truncate font-mono">{filename}</span>
            </div>
          )}
          {ppcRows.length > 0 && (
            <button
              onClick={leaveDataset}
              className="flex items-center gap-1 sm:gap-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-bold cursor-pointer transition shadow-xs shrink-0"
              title="Close current file and return to upload"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Clear File</span>
            </button>
          )}
          <button
            onClick={hardResetApp}
            className="flex items-center gap-1 sm:gap-1.5 bg-rose-950/20 hover:bg-rose-900/40 text-rose-200 hover:text-white border border-rose-900/40 hover:border-rose-700/60 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-bold cursor-pointer transition shadow-xs shrink-0"
            title="Factory reset all data, overrides, and formula adjustments"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Sandbox</span>
          </button>
        </div>
      </header>

      {/* Main layout routing switch */}
      {ppcRows.length === 0 ? (
        /* State A: EMPTY DATASET (Uploader or Standalone Calculator) */
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-8 animate-fade-in" id="empty-state-workspace">
          
          {/* Quick Selection Tab Header */}
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Welcome to WesBid Optimizer Lab</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg font-medium leading-relaxed">
              Upload raw Amazon PPC search term or targeting reports to simulate overall catalog impacts, or switch to the manual calculator for instant target bid mathematical breakdown.
            </p>
            
            <div className="inline-flex flex-wrap p-1 bg-slate-200/60 rounded-xl border border-slate-250 select-none justify-center gap-1">
              <button
                onClick={() => setActiveTab("TABLE")}
                className={`flex items-center gap-2 px-5 sm:px-7 py-2.5 rounded-lg text-xs font-bold cursor-pointer transition select-none ${
                  activeTab !== "CALCULATOR" && activeTab !== "QUICK_CALC"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload Report Sheets</span>
              </button>
              <button
                onClick={() => setActiveTab("QUICK_CALC")}
                className={`flex items-center gap-2 px-5 sm:px-7 py-2.5 rounded-lg text-xs font-bold cursor-pointer transition select-none ${
                  activeTab === "QUICK_CALC"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Clipboard className="w-4 h-4 text-brand" />
                <span>Quick ACOS Calculator</span>
              </button>
              <button
                onClick={() => setActiveTab("CALCULATOR")}
                className={`flex items-center gap-2 px-5 sm:px-7 py-2.5 rounded-lg text-xs font-bold cursor-pointer transition select-none ${
                  activeTab === "CALCULATOR"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Calculator className="w-4 h-4" />
                <span>Instant Sandbox Calc</span>
              </button>
            </div>
          </div>

          <div className="pt-2">
            {activeTab === "CALCULATOR" ? (
              <div className="max-w-6xl mx-auto space-y-4">
                <div className="bg-indigo-50/60 border border-indigo-150 rounded-xl p-4 text-xs font-semibold text-indigo-805 leading-relaxed text-indigo-800 flex items-start gap-2.5 mb-2 shadow-3xs">
                  <Info className="w-4.5 h-4.5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold block mb-0.5 text-indigo-950">Standalone calculator active:</span>
                    Showing direct calculations in Sandbox mode. Upload an Amazon Advertising Report sheet to overlay this logic on raw live metrics and generate comprehensive bulk sheet imports!
                  </div>
                </div>
                <ManualCalculator />
              </div>
            ) : activeTab === "QUICK_CALC" ? (
              <div className="max-w-6xl mx-auto space-y-4 animate-fade-in">
                <div className="bg-indigo-50/60 border border-indigo-150 rounded-xl p-4 text-xs font-semibold text-indigo-805 leading-relaxed text-indigo-800 flex items-start gap-2.5 mb-2 shadow-3xs">
                  <Info className="w-4.5 h-4.5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold block mb-0.5 text-indigo-950">Quick ACOS Calculator active:</span>
                    Paste raw or formatted Amazon Advertising widget statistics directly to calculate bid alignment with custom targets instantly.
                  </div>
                </div>
                <QuickAcosCalculator />
              </div>
            ) : (
              <UploadDropzone onDataLoaded={handleDataLoaded} />
            )}
          </div>
        </main>
      ) : (
        /* State B: ACTIVE SIMULATION WORKSPACE */
        <main className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
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

                {/* 3b. Match Type & Placement Modifiers */}
                <div className="space-y-3 pt-3 border-t border-dashed border-slate-100">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block">Bid Modifiers Customizer</span>
                  
                  {/* Exact Boost */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                      <span>Exact Match Boost</span>
                      <span className="font-mono font-bold text-indigo-700">+{config.exactMatchBoost ?? 10}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="1"
                      value={config.exactMatchBoost ?? 10}
                      onChange={(e) => setConfig(prev => ({ ...prev, exactMatchBoost: Number(e.target.value) }))}
                      className="w-full accent-indigo-650 cursor-ew-resize h-1 bg-slate-100 rounded-lg appearance-none"
                    />
                  </div>

                  {/* Broad Discount */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-600 font-medium font-sans">
                      <span>Broad/Auto Match Discount</span>
                      <span className="font-mono font-bold text-rose-700">-{config.broadMatchDiscount ?? 15}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="1"
                      value={config.broadMatchDiscount ?? 15}
                      onChange={(e) => setConfig(prev => ({ ...prev, broadMatchDiscount: Number(e.target.value) }))}
                      className="w-full accent-rose-600 cursor-ew-resize h-1 bg-slate-100 rounded-lg appearance-none"
                    />
                  </div>

                  {/* Top-of-Search Boost */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                      <span>Top-of-Search Boost</span>
                      <span className="font-mono font-bold text-emerald-700">+{config.tosPlacementBoost ?? 15}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="1"
                      value={config.tosPlacementBoost ?? 15}
                      onChange={(e) => setConfig(prev => ({ ...prev, tosPlacementBoost: Number(e.target.value) }))}
                      className="w-full accent-emerald-600 cursor-ew-resize h-1 bg-slate-100 rounded-lg appearance-none"
                    />
                  </div>
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

                {/* 6. WESBID V3 ADAPTIVE ENGINE CONTROL */}
                <div className="space-y-3 pt-4 border-t border-slate-200 mt-2 bg-slate-50/70 p-3 rounded-lg border">
                  <div className="flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                      <span className="text-[10px] font-black text-indigo-950 uppercase tracking-wider">WesBid v3 Engine</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={config.enableV3 ?? true} 
                        onChange={(e) => setConfig(prev => ({ ...prev, enableV3: e.target.checked }))}
                        className="sr-only peer" 
                      />
                      <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  
                  <p className="text-[9px] text-slate-500 leading-normal">
                    Upgrades static rules into state-driven confidence modeling: adapts adjustments according to individual query stability signals.
                  </p>

                  {(config.enableV3 ?? true) ? (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      {/* V3 Confidence Scale coefficient */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-700 font-bold">
                          <span>Confidence Scaling Coefficient</span>
                          <span className="font-mono text-indigo-700 font-black">{(config.confidenceScale ?? 75)}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          step="5"
                          value={config.confidenceScale ?? 75}
                          onChange={(e) => setConfig(prev => ({ ...prev, confidenceScale: Number(e.target.value) }))}
                          className="w-full accent-indigo-600 cursor-ew-resize h-1 bg-slate-200 rounded-lg appearance-none"
                        />
                        <p className="text-[8px] text-slate-400 leading-normal">
                          Dampens change adjustments heavily on unstable keywords (e.g. 1 order) to protect budgets.
                        </p>
                      </div>

                      {/* V3 Dynamic Decay Coefficient */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-700 font-bold">
                          <span>ACOS Performance Decay</span>
                          <span className="font-mono text-indigo-700 font-black">{(config.adaptiveDecay ?? 15)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="50"
                          step="5"
                          value={config.adaptiveDecay ?? 15}
                          onChange={(e) => setConfig(prev => ({ ...prev, adaptiveDecay: Number(e.target.value) }))}
                          className="w-full accent-indigo-600 cursor-ew-resize h-1 bg-slate-200 rounded-lg appearance-none"
                        />
                        <p className="text-[8px] text-slate-400 leading-normal">
                          Applies subtle safety gravity to scale events on keywords indicating performance degradation.
                        </p>
                      </div>
                      
                      <div className="bg-indigo-50 border border-indigo-100 rounded p-2 text-[8px] text-indigo-800 leading-normal font-semibold">
                        🛡️ Active Shield: Top-of-Search placement boost strictly gated (minimum 5 clicks + 1 order required) to avoid phantom ROAS scaling.
                      </div>
                    </div>
                  ) : (
                    <div className="text-[8px] text-slate-400 leading-normal italic bg-slate-100 p-2 rounded">
                      Legacy 2022 Static Rules active. Multi-state learning layers bypassed.
                    </div>
                  )}
                </div>

                {/* Live Impact Forecast widget */}
                <div className="pt-4 border-t border-slate-200 mt-2 space-y-2 select-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Dynamic Live Forecast</span>
                  <div className="bg-slate-900 text-white rounded-lg p-3.5 space-y-2 border border-slate-800 shadow-sm">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400 font-semibold">Formula Bid Shift</span>
                      <span className={`text-xs font-black font-mono ${impact.bidChangePercent < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                        {impact.bidChangePercent < 0 ? "" : "+"}{impact.bidChangePercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-medium">
                      <span className="text-slate-400">Waste Recovery Ratio</span>
                      <span className="text-indigo-400 font-bold font-mono">
                        {Math.max(5, Math.min(95, Math.round((impact.bleederCount / (ppcRows.length || 1)) * 100)))}%
                      </span>
                    </div>
                    <div className="border-t border-slate-800/80 pt-2 flex justify-between items-end">
                      <div>
                        <p className="text-[9px] text-slate-400 font-medium">Simulated Ad Spend</p>
                        <p className="text-xs font-extrabold font-mono text-emerald-450 text-emerald-400">${impact.estimatedNewSpend.toFixed(0)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-slate-400 font-medium font-sans">Delta Change</p>
                        <p className={`text-[9px] font-bold font-mono ${impact.estimatedNewSpend > impact.totalOriginalSpend ? "text-amber-500" : "text-emerald-400"}`}>
                          {impact.estimatedNewSpend > impact.totalOriginalSpend ? "▲" : "▼"} 
                          ${Math.abs(impact.totalOriginalSpend - impact.estimatedNewSpend).toFixed(0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 7. Model Context & Engineering Truths (Wes's Critique block) */}
                <div className="pt-4 border-t border-slate-200 mt-2 space-y-2 select-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Methodology & Resolution</span>
                  <div className="bg-slate-100/80 border border-slate-200 rounded-lg p-3 text-[10px] text-slate-650 leading-relaxed font-semibold">
                    <p className="mb-2 text-slate-800 font-extrabold flex items-center gap-1.5 select-none text-[10px] uppercase tracking-wider">
                      <Info className="w-4 h-4 text-slate-500 shrink-0" />
                      Engineering Model
                    </p>
                    <p className="mb-2">
                      Current bid state is resolved chronologically using the most recent dated record. Historical performance metrics are aggregated across the selected reporting window to reduce single-day volatility.
                    </p>
                    <p>
                      Recommendations are generated using current-state bids combined with aggregated performance data, while projected CPC, ACOS, and ROAS remain model estimates rather than guaranteed outcomes.
                    </p>
                  </div>
                </div>

                {/* Overrides list and batch restore card */}
                {Object.keys(overrides).length > 0 && (
                  <div className="pt-4 border-t border-slate-200 mt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Manual Overrides ({Object.keys(overrides).length})</span>
                      <button 
                        onClick={clearAllOverrides}
                        className="text-[9px] text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="bg-amber-50/50 border border-amber-200/60 rounded-lg p-2.5 space-y-1.5 max-h-40 overflow-y-auto">
                      {Object.entries(overrides).slice(0, 5).map(([id, bid]) => {
                        const row = ppcRows.find(r => r.id === id);
                        if (!row) return null;
                        return (
                          <div key={id} className="flex items-center justify-between text-[10px] bg-white border border-slate-100 p-1.5 rounded shadow-3xs">
                            <span className="font-mono text-slate-800 truncate font-semibold max-w-28" title={row.targeting}>
                              {row.targeting}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-amber-700 font-bold">${Number(bid).toFixed(2)}</span>
                              <button
                                onClick={() => handleResetOverride(id)}
                                className="p-0.5 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded transition cursor-pointer"
                                title="Remove custom bid"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {Object.keys(overrides).length > 5 && (
                        <p className="text-[9px] text-slate-400 text-center italic mt-1 pb-1">
                          + {Object.keys(overrides).length - 5} more overrides active...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* 8. Config Import / Export JSON Tuning Profiles */}
                <div className="pt-4 border-t border-slate-200 mt-2 space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Tuning Profile Backup</span>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2.5">
                    <p className="text-[9.5px] text-slate-500 leading-normal font-medium">
                      Back up your current Strategy Presets, learning click thresholds, math dampeners, match overrides, and dynamic active confidence sliders to a standalone JSON configuration file.
                    </p>
                    
                    {importStatus.message && (
                      <div className={`p-2 rounded text-[10px] font-semibold flex items-center gap-1.5 leading-snug animate-fade-in ${
                        importStatus.type === "success" 
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-150" 
                          : "bg-rose-50 text-rose-800 border border-rose-150"
                      }`}>
                        {importStatus.type === "success" ? "✅" : "⚠️"} {importStatus.message}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={handleExportConfig}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-white border border-slate-250 hover:bg-slate-50 hover:border-slate-350 text-slate-700 font-bold rounded text-[10.5px] transition cursor-pointer select-none shadow-3xs"
                        title="Download configuration to desktop as a JSON profile"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Backup JSON</span>
                      </button>

                      <label
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 text-indigo-700 font-bold rounded text-[10.5px] transition cursor-pointer select-none shadow-3xs text-center"
                        title="Restore previously saved tuning profile from computer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Restore JSON</span>
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImportConfig}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

              </div>
            </section>
          )}

            {/* RIGHT COLUMN: TABS PANEL (TABLE | SUMMARY | COPILOT) */}
            <section className={`${isSidebarOpen ? "lg:col-span-3" : "lg:col-span-4"} space-y-6 transition-all`}>
              
              {/* V2 Consolidator Banner */}
              {showDedupeAlert && ppcRows.length > 0 && (
                <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
                  <div className="flex items-start md:items-center gap-3">
                    <div className="h-6 px-2.5 bg-emerald-600 text-white text-[9px] font-black uppercase rounded-md tracking-wider flex items-center justify-center select-none shadow-xs whitespace-nowrap">
                      {reportType === "Amazon Search Term Report" ? "Search Term Mode" : "Targeting Mode"}
                    </div>
                    <div className="text-xs text-emerald-800 leading-relaxed font-medium">
                      <span className="font-bold text-emerald-950">Successfully Mapped {reportType}:</span>{" "}
                      {rawRecordsCount > ppcRows.length ? (
                        <span>
                          Combined <span className="font-extrabold text-emerald-950 underline">{rawRecordsCount}</span> report slices into <span className="font-extrabold text-emerald-950 underline">{ppcRows.length}</span> unique target keys (collapsed <span className="font-bold">{rawRecordsCount - ppcRows.length}</span> duplicates cleanly with chronologically resolved Max-Bid metrics).
                        </span>
                      ) : (
                        <span>
                          Imported and mapped <span className="font-extrabold text-emerald-950">{ppcRows.length}</span> target keywords/ASINs directly with full campaign-level performance telemetry.
                        </span>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowDedupeAlert(false)}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-950 cursor-pointer bg-emerald-100 hover:bg-emerald-200/80 px-2.5 py-1 rounded transition whitespace-nowrap self-end md:self-auto"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              
              {/* Top Navigation Row / Core Action Downloads */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 shadow-xs">
                
                {/* Mode Selector Tabs */}
                <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
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
                               <div className="flex gap-1.5 p-1 bg-slate-100 rounded-lg w-full sm:w-auto overflow-x-auto min-w-0">
                      <button
                        onClick={() => setActiveTab("TABLE")}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4.5 py-2 text-xs font-semibold rounded-md transition-all select-none cursor-pointer whitespace-nowrap ${
                          activeTab === "TABLE" 
                            ? "bg-white text-slate-900 shadow-xs" 
                            : "text-slate-600 hover:bg-slate-200/50"
                        }`}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                        Bidding Cockpit
                      </button>

                      <button
                        onClick={() => setActiveTab("SUMMARY")}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4.5 py-2 text-xs font-semibold rounded-md transition-all select-none cursor-pointer whitespace-nowrap ${
                          activeTab === "SUMMARY" 
                            ? "bg-white text-slate-900 shadow-xs" 
                            : "text-slate-600 hover:bg-slate-200/50"
                        }`}
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
                        Analytics Delta
                      </button>

                      <button
                        onClick={() => setActiveTab("COPILOT")}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4.5 py-2 text-xs font-semibold rounded-md transition-all select-none cursor-pointer whitespace-nowrap ${
                          activeTab === "COPILOT" 
                            ? "bg-white text-slate-900 shadow-xs" 
                            : "text-slate-600 hover:bg-slate-200/50"
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                        PPC Co-pilot AI
                      </button>

                      <button
                        onClick={() => setActiveTab("NICHES")}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4.5 py-2 text-xs font-semibold rounded-md transition-all select-none cursor-pointer whitespace-nowrap relative ${
                          activeTab === "NICHES" 
                            ? "bg-white text-slate-900 shadow-xs" 
                            : "text-slate-600 hover:bg-slate-200/50"
                        }`}
                      >
                        <div className="absolute top-1 right-1 flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                        </div>
                        <Compass className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                        Niche Explorer v1
                      </button>

                      <button
                        onClick={() => setActiveTab("DEDUP")}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4.5 py-2 text-xs font-semibold rounded-md transition-all select-none cursor-pointer whitespace-nowrap ${
                          activeTab === "DEDUP" 
                            ? "bg-white text-slate-900 shadow-xs font-bold font-sans" 
                            : "text-slate-600 hover:bg-slate-200/50"
                        }`}
                      >
                        <FolderSync className="w-3.5 h-3.5 text-emerald-600" />
                        Intent Dedup Filter
                      </button>

                      <button
                        onClick={() => setActiveTab("CALCULATOR")}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4.5 py-2 text-xs font-semibold rounded-md transition-all select-none cursor-pointer whitespace-nowrap ${
                          activeTab === "CALCULATOR" 
                            ? "bg-white text-slate-900 shadow-xs font-bold font-sans" 
                            : "text-slate-600 hover:bg-slate-200/50"
                        }`}
                      >
                        <Calculator className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                        Manual Bid Calculator
                      </button>

                      <button
                        onClick={() => setActiveTab("QUICK_CALC")}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4.5 py-2 text-xs font-semibold rounded-md transition-all select-none cursor-pointer whitespace-nowrap ${
                          activeTab === "QUICK_CALC" 
                            ? "bg-white text-slate-900 shadow-xs font-bold font-sans" 
                            : "text-slate-600 hover:bg-slate-200/50"
                        }`}
                      >
                        <Clipboard className="w-3.5 h-3.5 text-brand animate-pulse" />
                        Quick ACOS Calculator
                      </button>
                    </div>
                  </div>

                {/* Bulk Exports Buttons */}
                <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                  <button
                    onClick={() => downloadReport("analytical")}
                    className="flex-1 xl:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer select-none whitespace-nowrap"
                    id="btn-export-analyst"
                    title="Includes all analytics markers, current metrics, and suggest comments"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Export Analyst View
                  </button>

                  <button
                    onClick={() => downloadReport("amazon_bulk")}
                    className="flex-1 xl:flex-none flex items-center justify-center gap-1.5 px-4.5 py-2 bg-brand hover:bg-brand-hover text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow transition cursor-pointer select-none whitespace-nowrap"
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
                    onCurrentBidChange={handleCurrentBidChange}
                    targetAcos={config.targetAcos}
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

                {activeTab === "NICHES" && (
                  <NicheDiscovery
                    rows={ppcRows}
                    config={config}
                  />
                )}

                {activeTab === "DEDUP" && (
                  <IntentHarvester rows={ppcRows} />
                )}

                {activeTab === "CALCULATOR" && (
                  <ManualCalculator />
                )}

                {activeTab === "QUICK_CALC" && (
                  <QuickAcosCalculator />
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
