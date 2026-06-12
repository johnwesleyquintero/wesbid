/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { UploadCloud, FileSpreadsheet, Play, Sparkles, FileText } from "lucide-react";
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm max-w-3xl mx-auto my-6" id="upload-panel">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Load Your PPC Datasets</h2>
        <p className="text-slate-500 text-sm mt-2 max-w-lg mx-auto">
          Upload any Amazon Ads search terms, targeting, or ASIN bid reports. Or try out our hyper-realistic dataset in one click to evaluate recommended bid adjustments.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs leading-relaxed flex items-start gap-2">
          <span className="font-semibold text-rose-800">Error:</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {!pasteMode ? (
        <div>
          {/* Main Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
              dragActive 
                ? "border-brand bg-brand/5 shadow-inner" 
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
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
              <div className="p-4 bg-slate-50 rounded-full text-slate-400 mb-4 border border-slate-100">
                <UploadCloud className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-850">
                Drag & drop your PPC export file here, or <span className="text-brand underline">browse</span>
              </p>
              <p className="text-xs text-slate-400 mt-1.5">
                Supports Amazon Sponsored Products reports (.csv, .tsv, or .txt tab-delimited)
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-6 gap-4">
            <button
              onClick={() => setPasteMode(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
              id="btn-paste-mode"
            >
              <FileText className="w-3.5 h-3.5" />
              Paste Raw Data
            </button>

            <button
              onClick={loadSample}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow transition cursor-pointer active:scale-95"
              id="btn-load-sample"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Load Interactive Test Dataset (Recommended)
            </button>
          </div>
        </div>
      ) : (
        /* Code/Text Paste Box Mode */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Paste tab/comma separated report content:</span>
            <button
              onClick={() => setPasteMode(false)}
              className="text-xs font-medium text-slate-400 hover:text-slate-600"
            >
              Back to file upload
            </button>
          </div>

          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Campaign	Ad Group	Customer Search Term	Match Type	Impressions	Clicks	Spend	Sales	Orders	CPC	Current Bid..."
            className="w-full h-48 p-3 font-mono text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand bg-slate-50"
            id="paste-textarea"
          />

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setPasteMode(false)}
              className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handlePasteSubmit}
              className="px-5 py-2 text-xs font-semibold text-white bg-brand hover:bg-brand-hover rounded-lg shadow-sm cursor-pointer"
              id="btn-submit-pasted"
            >
              Process Copied Rows
            </button>
          </div>
        </div>
      )}

      {/* Guide Cards */}
      <div className="mt-8 border-t border-slate-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
        <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
          <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
            Amazon Campaign Targets
          </h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-normal">
            Export a "Targeting Report" or "Search Term Report" from the Amazon Advertising Console. The parser auto-detects English, European, and metric headers.
          </p>
        </div>

        <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
          <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Decision Engine Rules
          </h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-normal">
            Bids are evaluated on target ratios, learning loops, and spend velocity. Custom adjustments let you fine-tune criteria inside your strict guardrails.
          </p>
        </div>
      </div>
    </div>
  );
}
