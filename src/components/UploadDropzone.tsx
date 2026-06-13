/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Play, 
  Sparkles, 
  FileText, 
  ChevronRight, 
  Compass, 
  Shield, 
  BarChart3, 
  Activity, 
  ArrowRight,
  Database,
  Lock,
  Workflow
} from "lucide-react";
import { motion } from "motion/react";
import { SAMPLE_AMAZON_REPORT } from "../lib/sampleData";
import { parseAmazonReport } from "../lib/parser";
import { AmazonPpcRow } from "../types";

interface UploadDropzoneProps {
  onDataLoaded: (rows: AmazonPpcRow[], filename: string, rawCount?: number) => void;
}

export default function UploadDropzone({ onDataLoaded }: UploadDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave" || e.type === "dragend") {
      setDragActive(false);
    }
  };

  const processFileContent = (text: string, filename: string) => {
    try {
      const parsed = parseAmazonReport(text);
      if (parsed.length === 0) {
        setErrorMsg("Could not parse any rows from this file. Ensure it is a valid Amazon Ads CSV or Tab-delimited (TSV) report with headers like 'Campaign', 'Clicks', 'Spend', and 'Targeting' or 'Keyword'.");
        return;
      }
      setErrorMsg(null);
      // Count non-empty text rows (ignoring header) as primary raw feed density
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      const rawCount = lines.length > 1 ? lines.length - 1 : parsed.length;
      onDataLoaded(parsed, filename, rawCount);
    } catch (err: any) {
      setErrorMsg(`Parsing Error: ${err.message || "Invalid file format structure."}`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          processFileContent(event.target.result as string, file.name);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          processFileContent(event.target.result as string, file.name);
        }
      };
      reader.readAsText(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const loadSample = () => {
    processFileContent(SAMPLE_AMAZON_REPORT, "amazon_sample_ppc_report.tsv");
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) {
      setErrorMsg("Please paste some key raw CSV or TSV data cells.");
      return;
    }
    processFileContent(pasteText, "pasted_report_data.tsv");
  };

  const [demoAcos, setDemoAcos] = useState(30);
  const demoMockCpc = 1.20;
  const demoMockAcos = 45;
  const calculatedDemoBid = Number(Math.max(0.10, Math.min(3.50, demoMockCpc * (demoAcos / demoMockAcos))).toFixed(2));

  return (
    <div className="space-y-12 py-4">
      {/* Dynamic Animated Hero Area */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-4 max-w-4xl mx-auto"
      >
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 select-none tracking-wide uppercase">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
          VESBID OPTIMIZER LABS V3
        </span>
        <h1 className="text-4xl sm:text-5xl font-black font-heading text-slate-900 tracking-tight leading-none">
          The Tactical Portfolio Sandbox for <span className="bg-gradient-to-r from-indigo-650 to-indigo-850 bg-clip-text text-transparent">Amazon PPC Analysts</span>
        </h1>
        <p className="text-slate-500 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Simulate performance outcomes and design high-impact bidding campaigns risk-free. Transform standard Seller Central spreadsheet data into clean, ready-to-import bulk sheets with mathematical precision.
        </p>
      </motion.div>

      {/* Hero Interactive Split Preview & Drag Drop Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-7xl mx-auto">
        
        {/* Left Column: Interactive Mini Concept Engine (Tactile UI Proof) */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Activity className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Live Math preview</h3>
            </div>
            
            <p className="text-[11px] text-slate-400 leading-normal">
              Slide target ACOS parameters below to preview how our core formula calibrates dynamic suggested bids on under-performing target groups.
            </p>

            {/* Simulated Live Variable Block */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Target ACOS Ratio</span>
                <span className="text-sm font-black text-indigo-700 font-mono">{demoAcos}%</span>
              </div>
              
              <input 
                type="range"
                min="15"
                max="75"
                step="5"
                value={demoAcos}
                onChange={(e) => setDemoAcos(Number(e.target.value))}
                className="w-full accent-indigo-600 h-1.5 bg-slate-250 rounded-lg cursor-ew-resize appearance-none"
              />

              <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-center">
                <div className="bg-white p-2 rounded-lg border border-slate-200/40">
                  <span className="text-[9px] text-slate-400 uppercase block font-medium">Original CPC</span>
                  <span className="text-xs font-bold text-slate-700 font-mono">${demoMockCpc.toFixed(2)}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-250 bg-indigo-50/20">
                  <span className="text-[9px] text-indigo-500 uppercase block font-medium">WesBid Target</span>
                  <span className="text-xs font-extrabold text-indigo-700 font-mono">${calculatedDemoBid}</span>
                </div>
              </div>
            </div>

            <div className="text-[10px] bg-amber-50 text-amber-800 border border-amber-100 p-2.5 rounded-lg leading-relaxed select-none">
              ⚠️ <strong className="font-semibold text-amber-950">Safe-Grip Active:</strong> Bids are automatically clamped inside adaptive floors and ceiling caps to prevent rogue budget decay.
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-150">
            <button 
              onClick={loadSample}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer select-none shadow-xs active:scale-98"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Launch Sandbox Mode
            </button>
            <p className="text-center text-[9px] text-slate-400 mt-2 font-medium">Starts with 100+ simulated campaign rows</p>
          </div>
        </motion.div>

        {/* Right Column: Dynamic Data Capture Card */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between"
          id="upload-panel"
        >
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-400" />
                Select Ingestion Stream
              </h2>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full font-bold select-none">
                100% Client-Side Sandbox
              </span>
            </div>

            {errorMsg && (
              <div className="mb-4 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs leading-relaxed flex items-start gap-2.5 animate-fade-in">
                <span className="font-bold text-rose-900 shrink-0">Parsing Alert:</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {!pasteMode ? (
              <div className="space-y-4">
                {/* Main Drag & Drop Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 sm:p-11 text-center transition-all cursor-pointer relative overflow-hidden group ${
                    dragActive 
                      ? "border-indigo-500 bg-indigo-50/15 shadow-inner" 
                      : "border-slate-200 hover:border-slate-350 hover:bg-slate-50/50"
                  }`}
                  onClick={triggerFileInput}
                  id="dropzone"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".csv,.txt,.tsv"
                    onChange={handleFileInput}
                  />
                  <div className="flex flex-col items-center justify-center">
                    <div className="p-4 bg-slate-50 rounded-full text-slate-400 mb-4 border border-slate-100 group-hover:scale-105 transition-all">
                      <UploadCloud className="w-9 h-9 text-slate-500" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">
                      Drag & drop your Amazon Ads export here, or <span className="text-indigo-600 hover:text-indigo-850 underline font-bold">browse folders</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                      Accepts native Seller Central <strong>Sponsored Products Targeting Reports</strong> or <strong>Customer Search Term Reports</strong> (.csv, .tsv, .txt)
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button
                    onClick={() => setPasteMode(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-50 text-slate-650 hover:bg-slate-100 hover:text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold font-sans transition cursor-pointer select-none"
                    id="btn-paste-mode"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Paste Copied Spreadsheet Cells
                  </button>

                  <button
                    onClick={loadSample}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-extrabold shadow-xs transition cursor-pointer active:scale-98 select-none"
                    id="btn-load-sample"
                  >
                    <Play className="w-3.5 h-3.5 text-indigo-400" />
                    Interactive Sandbox Demo
                  </button>
                </div>
              </div>
            ) : (
              /* Clipboard Paste Hub */
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Copied spreadsheet values:
                  </span>
                  <button
                    onClick={() => setPasteMode(false)}
                    className="text-xs font-bold text-indigo-650 hover:text-indigo-850"
                  >
                    Back to Drag & Drop
                  </button>
                </div>

                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Campaign	Ad Group	Customer Search Term	Match Type	Impressions	Clicks	Spend	Sales	Orders	CPC	Current Bid..."
                  className="w-full h-42 p-3 font-mono text-[11px] leading-relaxed border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 bg-slate-50 shadow-inner placeholder-slate-400"
                  id="paste-textarea"
                />

                <div className="flex justify-end gap-2.5">
                  <button
                    onClick={() => setPasteMode(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-550 hover:bg-slate-50 border border-slate-255 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePasteSubmit}
                    className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer select-none"
                    id="btn-submit-pasted"
                  >
                    Process Raw Strings
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Privacy Footnote */}
          <div className="mt-6 border-t border-slate-100 pt-4 flex items-center gap-2 text-slate-400 select-none">
            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <p className="text-[10px] font-medium leading-normal">
              <strong>Enterprise Native Security Policy:</strong> Data analysis executing on client-side sandboxed processes only. Zero database persistence of your targeting spreadsheets, files, or CPC metrics.
            </p>
          </div>
        </motion.div>

      </div>

      {/* Bento-Style Key Capabilities Grids */}
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="text-center md:text-left">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Featured Pillars</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Adaptive Solver */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs space-y-3.5 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="h-9 w-9 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center border border-emerald-100">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 font-heading">Confidence-Driven Simulation</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                Optimize bids on statistical significance layers. Scale conversion stars and safely prune bleeders dynamically through our <strong>v3 Adaptive Confidence multipliers</strong> rather than generic static rule sets.
              </p>
            </div>
            <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50/50 px-2 py-0.5 rounded border border-emerald-100/50 w-fit">
              ✔ v3 Confidence Shift Active
            </div>
          </div>

          {/* Card 2: Intent Dedup Extraction */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs space-y-3.5 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="h-9 w-9 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center border border-indigo-100">
                <Compass className="w-5 h-5 animate-pulse" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 font-heading">Intent Harvester & Niche Explorer</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                Merge duplicate keyword variations cleanly. Auto-collapse fragmented targeting reports, resolve chronological maximums, explore organic intent clusters, and extract winning match strategies.
              </p>
            </div>
            <div className="text-[10px] text-indigo-600 font-bold bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100/50 w-fit">
              ✔ 2-Stage Deduplication Rule
            </div>
          </div>

          {/* Card 3: Standard Native Exports */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs space-y-3.5 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="h-9 w-9 bg-slate-50 text-slate-700 rounded-xl flex items-center justify-center border border-slate-100">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 font-heading">Universal Amazon Bulk Import</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                No slow, brittle API locks or token approvals. Quickly download a ready-to-import Amazon Campaign Manager Bulk Sheets Spreadsheet file immediately ready to upload back to production instantly.
              </p>
            </div>
            <div className="text-[10px] text-slate-600 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-150 w-fit">
              ✔ Standard Bulk Format
            </div>
          </div>

        </div>
      </div>

      {/* Stepper Workflow Progression Block */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 max-w-7xl mx-auto shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div className="space-y-1">
            <h3 className="text-xs font-extrabold text-indigo-650 uppercase tracking-widest flex items-center gap-1.5">
              <Workflow className="w-4 h-4 text-slate-400" />
              Workflow Progression
            </h3>
            <p className="text-sm font-semibold text-slate-850">Three steps to optimized campaign strategy</p>
          </div>
          <button 
            onClick={loadSample}
            className="text-[11px] text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 mt-2 sm:mt-0"
          >
            Or browse sample dataset instantly <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="flex gap-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-650 ring-4 ring-slate-50 shrink-0 select-none">
              1
            </span>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-800">Export Raw Reports</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
                Pull standard "Targeting" or "Search Term" reports containing Impressions, CPC, Clicks, Spend, and Sales metrics.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-650 ring-4 ring-slate-50 shrink-0 select-none">
              2
            </span>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-800">Tune Strategy Parameters</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
                Tweak boundaries and strategic multipliers in our Cockpit. Apply overrides or query the optionally secure Gemini Co-pilot Analyst.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-650 ring-4 ring-slate-50 shrink-0 select-none">
              3
            </span>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-800">Download bulk templates</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
                Download campaign-ready Amazon Bulk Spreadsheet macros that are natively recognized by Campaign Manager for fast uploads.
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
