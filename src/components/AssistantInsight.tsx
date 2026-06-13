/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  FileText, 
  Send, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Key, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Trash2 
} from "lucide-react";
import { AmazonPpcRow, BidRecommendation, OptimizerConfig } from "../types";

interface AssistantInsightProps {
  rows: AmazonPpcRow[];
  recommendations: Record<string, BidRecommendation>;
  activePresetName: string;
  config: OptimizerConfig;
  stats: any;
}

export default function AssistantInsight({
  rows,
  recommendations,
  activePresetName,
  config,
  stats
}: AssistantInsightProps) {
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [reportText, setReportText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Custom user API key states
  const [userApiKeyInput, setUserApiKeyInput] = useState<string>("");
  const [savedApiKey, setSavedApiKey] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Load API key from local storage on mount
  useEffect(() => {
    const key = localStorage.getItem("ppc_copilot_user_key") || "";
    setUserApiKeyInput(key);
    setSavedApiKey(key);
  }, []);

  const handleSaveKey = () => {
    const keyToSave = userApiKeyInput.trim();
    localStorage.setItem("ppc_copilot_user_key", keyToSave);
    setSavedApiKey(keyToSave);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 4000);
  };

  const handleClearKey = () => {
    localStorage.removeItem("ppc_copilot_user_key");
    setUserApiKeyInput("");
    setSavedApiKey("");
    setSaveSuccess(false);
  };

  const steps = [
    "Compiling active PPC targeting data...",
    "Isolating high-spend non-converting keywords (bleeders)...",
    "Auditing hyper-efficient superstar targets (low ACOS)...",
    "Running scenarios under dampening shift rules...",
    "Synthesizing Strategic PPC memo from WesBid Lab AI Co-pilot..."
  ];

  const generateReport = async () => {
    setLoading(true);
    setErrorText(null);
    setStepIndex(0);

    // Set up step loading sequence timer
    const interval = setInterval(() => {
      setStepIndex(prev => {
        if (prev < steps.length - 1) return prev + 1;
        return prev;
      });
    }, 1200);

    // Find top 3 bleeders
    const allRecs = Object.values(recommendations);
    const bleeders = allRecs
      .filter(r => r.action === "REDUCE" && r.orders === 0 && r.clicks >= config.bleederClicks)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 4);

    // Find top 3 star performers
    const stars = allRecs
      .filter(r => r.sales > 0 && r.acos < 0.20)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 4);

    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          strategyName: activePresetName,
          config,
          stats,
          topBleeders: bleeders,
          topStars: stars,
          totalRows: rows.length,
          userApiKey: savedApiKey
        })
      });

      const rawText = await response.text();
      
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        // Attempt to extract the JSON object portion if there is surrounding formatting or text
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            data = JSON.parse(jsonMatch[0]);
          } catch (innerErr) {
            console.warn("Regex-extracted JSON block could not be parsed:", innerErr);
          }
        }
      }

      if (!data) {
        const isHtml = rawText.trim().toLowerCase().startsWith("<!doctype") || 
                       rawText.trim().toLowerCase().startsWith("<html") || 
                       rawText.includes("The page c");
        if (isHtml) {
          throw new Error("The server returned an HTML/Error page instead of valid JSON. This usually indicates that the backend server is starting up, crashed, or encountered an internal network issue. If you are using a custom key, please check your key configuration.");
        }
        throw new Error(`The server response could not be parsed as valid JSON: ${rawText.slice(0, 150)}...`);
      }
      
      if (!response.ok) {
        throw new Error(data.error || `Server returned code ${response.status}`);
      }

      setReportText(data.text);
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "An unexpected error occurred while communicating with the PPC server.");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  // Safe client-side Markdown visual decorator, parses simple formatting cleanly
  const renderFormattedReport = (raw: string) => {
    const lines = raw.split("\n");
    return lines.map((line, idx) => {
      let trimmed = line.trim();

      // Heading 1
      if (trimmed.startsWith("# ")) {
        return <h1 key={idx} className="text-xl font-bold text-slate-800 mt-6 mb-2">{trimmed.slice(2)}</h1>;
      }
      // Heading 2
      if (trimmed.startsWith("## ")) {
        return <h2 key={idx} className="text-lg font-bold text-slate-800 mt-5 mb-2.5 pb-1 border-b border-slate-100">{trimmed.slice(3)}</h2>;
      }
      // Heading 3
      if (trimmed.startsWith("### ")) {
        return <h3 key={idx} className="text-md font-bold text-slate-800 mt-4 mb-2">{trimmed.slice(4)}</h3>;
      }
      // Bullet Items
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const item = trimmed.slice(2);
        return (
          <li key={idx} className="ml-5 list-disc text-sm text-slate-600 mb-1.5 leading-relaxed">
            {parseInlineStyling(item)}
          </li>
        );
      }
      // Ordinals / Lists (e.g. 1. , 2. )
      const regexOrdinal = /^\d+\.\s(.*)/;
      if (regexOrdinal.test(trimmed)) {
        const match = trimmed.match(regexOrdinal);
        if (match) {
          return (
            <li key={idx} className="ml-5 list-decimal text-sm text-slate-600 mb-1.5 leading-relaxed">
              {parseInlineStyling(match[1])}
            </li>
          );
        }
      }
      // Blockquotes
      if (trimmed.startsWith("> ")) {
        return (
          <blockquote key={idx} className="pl-4 border-l-4 border-brand bg-slate-50 italic py-2 px-3 text-sm text-slate-600 my-4 rounded">
            {trimmed.slice(2)}
          </blockquote>
        );
      }
      // Normal text / spacers
      if (trimmed === "") {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="text-sm text-slate-600 mb-3 leading-relaxed">
          {parseInlineStyling(line)}
        </p>
      );
    });
  };

  // Inline styling parser for **bold** and *italic*
  const parseInlineStyling = (text: string) => {
    // Basic regex bolding split
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index} className="font-semibold text-slate-950">{part.slice(2, -2)}</strong>;
      }
      // Italic substitution
      const subParts = part.split(/(\*.*?\*)/g);
      return subParts.map((subPart, subIndex) => {
        if (subPart.startsWith("*") && subPart.endsWith("*")) {
          return <em key={subIndex} className="italic text-slate-600">{subPart.slice(1, -1)}</em>;
        }
        return subPart;
      });
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs max-w-4xl mx-auto my-6" id="co-pilot-panel">
      {/* Header element */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand text-white rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 leading-tight">PPC Strategy Co-pilot</h2>
            <p className="text-slate-400 text-xs">AI-synthesized diagnostic analysis of your bid portfolio.</p>
          </div>
        </div>

        {reportText && !loading && (
          <button
            onClick={generateReport}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recalculate
          </button>
        )}
      </div>

      {/* Dynamic API Configuration Control Panel */}
      <div className="mb-6 bg-slate-50 rounded-xl p-4 border border-slate-200/60 text-xs shadow-2xs">
        <div 
          className="flex items-center justify-between cursor-pointer select-none" 
          onClick={() => setShowSettings(!showSettings)}
        >
          <div className="flex items-center gap-2.5 flex-wrap">
            <Key className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-slate-700">Custom Gemini API Key</span>
            {savedApiKey ? (
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold leading-none">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Stored in Browser
              </span>
            ) : (
              <span className="inline-flex items-center bg-slate-200 text-slate-605 px-2.5 py-0.5 rounded-full text-[10px] font-bold leading-none">
                Workspace Defaults Active
              </span>
            )}
          </div>
          <button className="text-indigo-650 hover:text-indigo-850 font-bold text-[11px] uppercase tracking-wider transition">
            {showSettings ? "Close Settings" : "Configure Key"}
          </button>
        </div>
        
        {showSettings && (
          <div className="mt-3.5 space-y-3.5 border-t border-slate-200/60 pt-3.5 transition-all">
            <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
              By default, the optimizer leverages our Workspace default model configurations. To bypass limitations or leverage your premium tier, you can store your own free or paid <strong className="text-slate-700">Gemini API Key</strong> locally inside your browser's secure sandboxed storage. It is only held on your device and is securely passed on-demand for co-pilot workflows.
            </p>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <input
                  type={showApiKey ? "text" : "password"}
                  placeholder="Paste your Gemini API Key here (AIzaSy...)"
                  value={userApiKeyInput}
                  onChange={(e) => setUserApiKeyInput(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 font-mono text-xs focus:ring-1 focus:ring-slate-400 focus:outline-none focus:border-slate-400 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition"
                  title={showApiKey ? "Hide Key" : "Show Key"}
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleSaveKey}
                  disabled={!userApiKeyInput.trim()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-lg text-xs font-semibold font-sans transition cursor-pointer select-none"
                >
                  Save Key
                </button>
                {savedApiKey && (
                  <button
                    onClick={handleClearKey}
                    className="p-2 border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Remove custom key from local storage"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                )}
              </div>
            </div>
            
            {saveSuccess && (
              <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1.5 animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Custom API key updated and active! It will be securely passed server-side for co-pilot workloads.
              </p>
            )}
          </div>
        )}
      </div>

      {/* State 1: Locked, ready to run */}
      {!reportText && !loading && !errorText && (
        <div className="text-center py-10 px-4">
          <div className="max-w-md mx-auto space-y-4">
            <p className="text-sm text-slate-500">
              Run the PPC Strategy Co-pilot to generate a complete strategic narrative based on your current bid configurations. The co-pilot detects structural wastes, identifies high-potential targets, and provides operational checklists.
            </p>
            <button
              onClick={generateReport}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition inline-flex items-center gap-2 cursor-pointer"
              id="btn-generate-copilot"
            >
              <Send className="w-3.5 h-3.5" />
              Generate PPC Co-pilot Report
            </button>
          </div>
        </div>
      )}

      {/* State 2: Loading progressive steps */}
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand border-t-transparent mb-5" />
          <div className="text-center max-w-sm space-y-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-brand bg-brand/10 text-center px-2.5 py-0.5 rounded-full select-none">Generating Memo</span>
            <p className="text-xs text-slate-400 animate-pulse mt-1" id="loading-step-text">
              {steps[stepIndex]}
            </p>
          </div>
        </div>
      )}

      {/* State 3: Error */}
      {errorText && (
        <div className="p-5 border border-rose-100 bg-rose-50 rounded-xl text-rose-700 space-y-3 my-4">
          <div className="flex gap-2.5 items-start">
            <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-sm text-rose-900">Co-pilot Generation Failed</h3>
              <p className="text-xs text-rose-700/80 mt-1">
                {errorText}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-rose-800/70 border-t border-rose-200/50 pt-2 leading-relaxed">
            Note: This feature requires a valid Gemini API Key. Make sure you have opened **Settings &gt; Secrets** of the AI Studio workspace and provided a valid key under <code className="bg-rose-100 px-1 py-0.5 font-mono text-[10px] rounded text-rose-900">GEMINI_API_KEY</code>.
          </p>
          <div className="pt-1 flex gap-2">
            <button
              onClick={generateReport}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-md shadow-sm transition cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* State 4: Formatted Strategic report */}
      {reportText && !loading && (
        <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-6 md:p-8 text-left prose prose-slate max-w-none" id="co-pilot-report">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-brand uppercase mb-4 select-none">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Strategic PPC optimization memo prepared
          </div>
          
          <div className="space-y-1">
            {renderFormattedReport(reportText)}
          </div>
        </div>
      )}
    </div>
  );
}
