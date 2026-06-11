/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Sparkles, FileText, Send, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
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
          totalRows: rows.length
        })
      });

      const data = await response.json();
      
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
