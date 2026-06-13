/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  Check, 
  RotateCcw, 
  Edit2, 
  Download, 
  Sparkle,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Copy,
  ChevronDown as Sliders,
  CheckSquare,
  FileText,
  X
} from "lucide-react";
import { AmazonPpcRow, BidRecommendation } from "../types";

function HighlightText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="bg-amber-100 text-amber-950 px-0.5 rounded font-bold">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

interface BidTableProps {
  rows: AmazonPpcRow[];
  recommendations: Record<string, BidRecommendation>;
  onBidOverride: (rowId: string, newBid: number) => void;
  onResetOverride: (rowId: string) => void;
  onBulkOverride: (rowIds: string[], multiplier: number) => void;
  onBulkSetAction: (rowIds: string[], action: "SCALE" | "REDUCE" | "HOLD") => void;
  onCurrentBidChange: (rowId: string, newBid: number) => void;
  targetAcos?: number;
}

type SortField = "targeting" | "clicks" | "spend" | "sales" | "acos" | "cpc" | "currentBid" | "suggestedBid" | "action" | "ctr";

export default function BidTable({
  rows,
  recommendations,
  onBidOverride,
  onResetOverride,
  onBulkOverride,
  onBulkSetAction,
  onCurrentBidChange,
  targetAcos = 30
}: BidTableProps) {
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<"ALL" | "SCALE" | "HOLD" | "REDUCE" | "BLEEDER" | "TOP_PERFORMERS">("ALL");
  
  // Advanced Metrics Filters State
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [minSpend, setMinSpend] = useState<number>(0);
  const [minClicks, setMinClicks] = useState<number>(0);
  const [onlyWaste, setOnlyWaste] = useState<boolean>(false); // clicks > 0 and 0 orders
  const [onlyStars, setOnlyStars] = useState<boolean>(false); // CVR >= 20%
  const [selectedMatchType, setSelectedMatchType] = useState<string>("ALL");
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // Memoize top performers: top 10% computed across all rows sorted descending by ROAS
  const topPerformersIds = useMemo(() => {
    const saleRows = rows
      .filter(r => r.sales > 0 && r.spend >= 0)
      .map(r => {
        const roas = r.spend > 0 ? (r.sales / r.spend) : (r.sales / 0.01);
        return { id: r.id, roas };
      });
    
    saleRows.sort((a, b) => b.roas - a.roas);
    const topCount = Math.ceil(rows.length * 0.10);
    const topIds = new Set(saleRows.slice(0, topCount).map(r => r.id));
    return topIds;
  }, [rows]);
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>("clicks");
  const [sortAsc, setSortAsc] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Bulk Row Selection
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [isOpenBulkMenu, setIsOpenBulkMenu] = useState(false);
  const [bulkMultiplierText, setBulkMultiplierText] = useState("10");

  // Expanded query rows (collapse/rollup state)
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());

  // Local temporary editing state to prevent .toFixed(2) formatting from blocking user typing
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  const toggleRowExpanded = (rowId: string) => {
    const nextSet = new Set(expandedRowIds);
    if (nextSet.has(rowId)) {
      nextSet.delete(rowId);
    } else {
      nextSet.add(rowId);
    }
    setExpandedRowIds(nextSet);
  };

  // Handle Header Sort Click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default to descending (most clicks/spend first)
    }
    setCurrentPage(1);
  };

  // Filter & Sort Rows
  const processedRows = useMemo(() => {
    let list = [...rows];

    // Search filter
    if (searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        r => r.targeting.toLowerCase().includes(q) || r.campaign.toLowerCase().includes(q)
      );
    }

    // Action state filter
    if (actionFilter !== "ALL") {
      if (actionFilter === "TOP_PERFORMERS") {
        list = list.filter(r => topPerformersIds.has(r.id));
      } else {
        list = list.filter(r => {
          const rec = recommendations[r.id];
          if (!rec) return false;
          if (actionFilter === "BLEEDER") {
            return rec.action === "REDUCE" && rec.reason.toLowerCase().includes("bleeder");
          }
          return rec.action === actionFilter;
        });
      }
    }

    // Advanced match type filter
    if (selectedMatchType !== "ALL") {
      list = list.filter(r => r.matchType === selectedMatchType);
    }

    // Min spend filter
    if (minSpend > 0) {
      list = list.filter(r => r.spend >= minSpend);
    }

    // Min clicks filter
    if (minClicks > 0) {
      list = list.filter(r => r.clicks >= minClicks);
    }

    // Zero-order waste only filter (Clicks > 0 and 0 Orders)
    if (onlyWaste) {
      list = list.filter(r => r.clicks > 0 && r.orders === 0);
    }

    // Star converted targets (Conversion stars: Sales > 0 and CVR >= 20% / orders >= 2)
    if (onlyStars) {
      list = list.filter(r => r.sales > 0 && r.orders >= 1 && r.cvr >= 0.15);
    }

    // Numeric & Text Sort
    list.sort((a, b) => {
      let valA: any = a[sortField as keyof AmazonPpcRow] ?? 0;
      let valB: any = b[sortField as keyof AmazonPpcRow] ?? 0;

      // Swap values out of recommendations table if sorting by suggested bid/action
      if (sortField === "currentBid") {
        valA = a.currentBid || a.cpc || 1.00;
        valB = b.currentBid || b.cpc || 1.00;
      } else if (sortField === "suggestedBid") {
        valA = recommendations[a.id]?.suggestedBid ?? (a.currentBid || a.cpc || 1.00);
        valB = recommendations[b.id]?.suggestedBid ?? (b.currentBid || b.cpc || 1.00);
      } else if (sortField === "action") {
        valA = recommendations[a.id]?.action ?? "HOLD";
        valB = recommendations[b.id]?.action ?? "HOLD";
      }

      if (typeof valA === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return sortAsc ? valA - valB : valB - valA;
      }
    });

    return list;
  }, [rows, recommendations, searchTerm, actionFilter, sortField, sortAsc, selectedMatchType, minSpend, minClicks, onlyWaste, onlyStars, topPerformersIds]);

  // Pagination bounds
  const totalPages = Math.ceil(processedRows.length / pageSize);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedRows.slice(start, start + pageSize);
  }, [processedRows, currentPage, pageSize]);

  // Selections
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = processedRows.map(r => r.id);
      setSelectedRowIds(new Set(allIds));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  const handleSelectRow = (rowId: string, checked: boolean) => {
    const nextSet = new Set(selectedRowIds);
    if (checked) {
      nextSet.add(rowId);
    } else {
      nextSet.delete(rowId);
    }
    setSelectedRowIds(nextSet);
  };

  const isAllSelectedOnPage = useMemo(() => {
    if (processedRows.length === 0) return false;
    return processedRows.every(r => selectedRowIds.has(r.id));
  }, [processedRows, selectedRowIds]);

  // Bulk modifier trigger
  const runBulkMultiplier = (direction: "up" | "down") => {
    const multiplierVal = parseFloat(bulkMultiplierText) / 100;
    if (isNaN(multiplierVal) || multiplierVal <= 0) return;
    
    // e.g. direction = up -> multiplier is 1 + 0.10 = 1.10
    // direction = down -> multiplier is 1 - 0.10 = 0.90
    const finalMult = direction === "up" ? (1 + multiplierVal) : (1 - multiplierVal);
    onBulkOverride(Array.from(selectedRowIds) as string[], finalMult);
    setSelectedRowIds(new Set()); // Clear selection
    setIsOpenBulkMenu(false);
  };

  const runBulkSetAction = (action: "SCALE" | "REDUCE" | "HOLD") => {
    onBulkSetAction(Array.from(selectedRowIds) as string[], action);
    setSelectedRowIds(new Set()); // Clear selection
    setIsOpenBulkMenu(false);
  };

  const resetBulkOverrides = () => {
    (Array.from(selectedRowIds) as string[]).forEach(id => onResetOverride(id));
    setSelectedRowIds(new Set());
    setIsOpenBulkMenu(false);
  };

  const handleCopyFilteredTargets = () => {
    if (processedRows.length === 0) return;
    
    // Header
    let text = "Targeting\tMatch Type\tCampaign\tCurrent Bid\tSuggested Bid\tSpend\tSales\tOrders\n";
    processedRows.forEach(row => {
      const rec = recommendations[row.id];
      const curBid = row.currentBid || row.cpc || 1.00;
      const sugBid = rec ? rec.suggestedBid : curBid;
      text += `${row.targeting}\t${row.matchType || "Broad"}\t${row.campaign}\t$${curBid.toFixed(2)}\t$${sugBid.toFixed(2)}\t$${row.spend.toFixed(2)}\t$${row.sales.toFixed(2)}\t${row.orders}\n`;
    });

    navigator.clipboard.writeText(text);
    setCopyToast(`Successfully copied ${processedRows.length} targets! Standard tab-delimited columns are ready to paste into Excel or Seller Central bulk sheets.`);
    setTimeout(() => {
      setCopyToast(null);
    }, 5500);
  };

  const clearAdvancedFilters = () => {
    setMinSpend(0);
    setMinClicks(0);
    setOnlyWaste(false);
    setOnlyStars(false);
    setSelectedMatchType("ALL");
  };

  const hasActiveAdvancedFilters = minSpend > 0 || minClicks > 0 || onlyWaste || onlyStars || selectedMatchType !== "ALL";

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs mt-6 relative" id="bidding-cockpit">
      {/* Toast Notification for Clipboard Copy */}
      {copyToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-indigo-900 border border-indigo-700 text-white rounded-xl shadow-xl px-4.5 py-3 text-xs flex items-center gap-3 animate-fade-in w-11/12 max-w-lg">
          <div className="p-1 rounded-full bg-indigo-500/20 text-white">
            <Check className="w-4 h-4" />
          </div>
          <div className="flex-1 font-medium leading-relaxed">
            {copyToast}
          </div>
          <button onClick={() => setCopyToast(null)} className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white transition cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Control Panel: Search & State Filters */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col xl:flex-row items-center gap-4 justify-between">
        {/* State filters */}
        <div className="flex gap-1.5 p-1 bg-slate-100 rounded-lg self-start xl:self-center overflow-x-auto w-full xl:w-auto">
          {(["ALL", "TOP_PERFORMERS", "SCALE", "HOLD", "REDUCE", "BLEEDER"] as const).map(f => {
            const label = f === "ALL" 
              ? "All Bids" 
              : f === "TOP_PERFORMERS"
              ? "⭐ Top Performers"
              : f === "SCALE" 
              ? "Scale" 
              : f === "HOLD" 
              ? "Hold" 
              : f === "REDUCE" 
              ? "Reduce" 
              : "Bleeders";
            
            const activeColor = f === "SCALE" 
              ? "bg-slate-900 text-white shadow-xs" 
              : f === "TOP_PERFORMERS"
              ? "bg-amber-500 text-slate-950 font-extrabold border border-amber-300 shadow-sm animate-fade-in"
              : f === "HOLD" 
              ? "bg-amber-600 text-white shadow-xs" 
              : f === "REDUCE" || f === "BLEEDER"
              ? "bg-rose-600 text-white shadow-xs"
              : "bg-slate-800 text-white";

            return (
              <button
                key={f}
                onClick={() => { setActionFilter(f); setCurrentPage(1); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer select-none ${
                  actionFilter === f 
                    ? activeColor 
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Search, Advanced Metric Filter Button and Simple Clipboard Copier */}
        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-end">
          {/* Advanced Filter Trigger */}
          <button
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              isAdvancedOpen || hasActiveAdvancedFilters
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Metric Filters</span>
            {hasActiveAdvancedFilters && (
              <span className="h-2 w-2 rounded-full bg-indigo-600 inline-block animate-pulse"></span>
            )}
          </button>

          {/* Quick Clipboard Copy */}
          <button
            onClick={handleCopyFilteredTargets}
            disabled={processedRows.length === 0}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            title="Copy current filtered keyword recommendations ready to excel clipboard"
            id="btn-quick-copy"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Filtered ({processedRows.length})</span>
          </button>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <span className="absolute left-3 top-2.5 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search target keywords / ASINs..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand bg-white"
              id="table-search"
            />
          </div>
        </div>
      </div>

      {/* Expandable Advanced Filters Drawer Panel */}
      {isAdvancedOpen && (
        <div className="bg-slate-50 border-b border-slate-150 p-5 grid grid-cols-1 md:grid-cols-4 gap-6 text-xs animate-fade-in">
          {/* Match types */}
          <div className="space-y-2">
            <label className="font-bold text-slate-650 block">Target Match Type</label>
            <select
              value={selectedMatchType}
              onChange={(e) => { setSelectedMatchType(e.target.value); setCurrentPage(1); }}
              className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none font-semibold text-slate-700"
            >
              <option value="ALL">All Types</option>
              <option value="EXACT">Exact</option>
              <option value="PHRASE">Phrase</option>
              <option value="BROAD">Broad</option>
              <option value="TARGETING_EXPRESSION_PREDEFINED">Expression / Auto</option>
            </select>
          </div>

          {/* Spend Slider */}
          <div className="space-y-1">
            <div className="flex justify-between font-bold">
              <span>Min Spend Filters</span>
              <span className="font-mono text-slate-900">${minSpend}</span>
            </div>
            <input
              type="range"
              min="0"
              max="500"
              step="5"
              value={minSpend}
              onChange={(e) => { setMinSpend(Number(e.target.value)); setCurrentPage(1); }}
              className="w-full accent-indigo-650 cursor-ew-resize h-1.5 bg-slate-200 rounded-lg"
            />
            <p className="text-[9px] text-slate-400">Hide targeting metrics with spend lower than this.</p>
          </div>

          {/* Clicks Slider */}
          <div className="space-y-1">
            <div className="flex justify-between font-bold">
              <span>Min Clicks Filter</span>
              <span className="font-mono text-slate-900">{minClicks} clicks</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="2"
              value={minClicks}
              onChange={(e) => { setMinClicks(Number(e.target.value)); setCurrentPage(1); }}
              className="w-full accent-indigo-650 cursor-ew-resize h-1.5 bg-slate-200 rounded-lg"
            />
            <p className="text-[9px] text-slate-400">Filter keywords with minimum click traffic volumes.</p>
          </div>

          {/* Dynamic flags checkboxes */}
          <div className="space-y-2">
            <label className="font-bold text-slate-650 block">Performance Flags</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={onlyWaste}
                  onChange={(e) => { setOnlyWaste(e.target.checked); setCurrentPage(1); }}
                  className="rounded border-slate-300 text-brand accent-brand focus:ring-brand"
                />
                <span className="text-rose-750">Bleeder Clicks with 0 Sales</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={onlyStars}
                  onChange={(e) => { setOnlyStars(e.target.checked); setCurrentPage(1); }}
                  className="rounded border-slate-300 text-brand accent-brand focus:ring-brand"
                />
                <span className="text-emerald-750">Star Converters CVR &ge; 15%</span>
              </label>
            </div>

            {hasActiveAdvancedFilters && (
              <button
                onClick={clearAdvancedFilters}
                className="mt-2 text-[10px] font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
              >
                Clear advanced filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bulk Toolbar, visible only when selections exist */}
      {selectedRowIds.size > 0 && (
        <div className="bg-slate-900 text-white px-5 py-3 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold bg-brand bg-emerald-600/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full select-none">
                {selectedRowIds.size} Selected
              </span>
              <button 
                onClick={() => setSelectedRowIds(new Set())}
                className="text-[10px] text-slate-400 hover:text-white hover:underline cursor-pointer transition"
              >
                (Clear selection)
              </button>
            </div>
            <p className="text-xs text-slate-300">Run sandbox actions in bulk across these targeting terms:</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Bid adjustment parameters */}
            <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 overflow-hidden text-xs">
              <span className="pl-3 pr-1 text-slate-400 font-medium">Shift by</span>
              <input
                type="number"
                value={bulkMultiplierText}
                onChange={(e) => setBulkMultiplierText(e.target.value)}
                className="w-11 bg-transparent border-none text-center outline-none py-1 text-brand font-bold"
              />
              <span className="pr-2 text-slate-400 font-semibold">%</span>
              <button
                onClick={() => runBulkMultiplier("up")}
                className="px-2.5 py-1.5 bg-slate-700 hover:bg-brand border-l border-slate-600 font-semibold text-white transition cursor-pointer select-none"
                title="Increase bids"
              >
                +
              </button>
              <button
                onClick={() => runBulkMultiplier("down")}
                className="px-2.5 py-1.5 bg-slate-700 hover:bg-reduce-text border-l border-slate-600 font-semibold text-white transition cursor-pointer select-none"
                title="Decrease bids"
              >
                -
              </button>
            </div>

            {/* Force Action states */}
            <div className="flex bg-slate-800 border border-slate-700 rounded-lg overflow-hidden text-xs font-semibold">
              <button 
                onClick={() => runBulkSetAction("SCALE")}
                className="px-2.5 py-1.5 hover:bg-brand border-r border-slate-700 transition cursor-pointer"
              >
                Force Scale
              </button>
              <button 
                onClick={() => runBulkSetAction("REDUCE")}
                className="px-2.5 py-1.5 hover:bg-reduce-text border-r border-slate-700 transition cursor-pointer"
              >
                Force Reduce
              </button>
              <button 
                onClick={() => runBulkSetAction("HOLD")}
                className="px-2.5 py-1.5 hover:bg-slate-700 transition cursor-pointer"
              >
                Force Hold
              </button>
            </div>

            <button 
              onClick={resetBulkOverrides}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium cursor-pointer"
              title="Reset manual overrides to formula suggest values"
            >
              Reset Selected
            </button>
          </div>
        </div>
      )}

      {/* Main Responsive Grid Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] lg:min-w-full text-left border-collapse" id="ppc-data-table">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <th className="p-4 w-12 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelectedOnPage}
                  onChange={handleSelectAll}
                  className="rounded border-slate-300 focus:ring-brand accent-brand text-brand"
                />
              </th>
              
              <th 
                className="p-4 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors"
                onClick={() => handleSort("targeting")}
              >
                <div className="flex items-center gap-1">
                  Targeting / Campaign
                  {sortField === "targeting" && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>

              <th 
                className="p-4 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors text-right"
                onClick={() => handleSort("clicks")}
              >
                <div className="flex items-center justify-end gap-1">
                  Clicks
                  {sortField === "clicks" && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>

              <th 
                className="p-4 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors text-right"
                onClick={() => handleSort("ctr")}
              >
                <div className="flex items-center justify-end gap-1">
                  CTR
                  {sortField === "ctr" && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>

              <th 
                className="p-4 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors text-right"
                onClick={() => handleSort("cpc")}
                title="Historical average Cost-Per-Click"
              >
                <div className="flex items-center justify-end gap-1">
                  CPC
                  {sortField === "cpc" && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>

              <th 
                className="p-4 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors text-right"
                onClick={() => handleSort("spend")}
              >
                <div className="flex items-center justify-end gap-1">
                  Spend
                  {sortField === "spend" && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>

              <th 
                className="p-4 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors text-right"
                onClick={() => handleSort("sales")}
              >
                <div className="flex items-center justify-end gap-1">
                  Sales
                  {sortField === "sales" && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>

              <th 
                className="p-4 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors text-right"
                onClick={() => handleSort("acos")}
              >
                <div className="flex items-center justify-end gap-1">
                  ACOS
                  {sortField === "acos" && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>

              <th 
                className="p-4 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors text-right cursor-help"
                onClick={() => handleSort("currentBid")}
                title="Current bid parsed (or fallback to average CPC if bid row empty)"
              >
                <div className="flex items-center justify-end gap-1">
                  Current Bid
                  {sortField === "currentBid" && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>

              <th 
                className="p-4 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors text-right text-brand bg-brand/[0.03]"
                onClick={() => handleSort("suggestedBid")}
              >
                <div className="flex items-center justify-end gap-1">
                  Suggested Bid
                  {sortField === "suggestedBid" && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>

              <th className="p-4 text-right bg-violet-50/20 text-indigo-900 border-l border-slate-100 w-44" title="Simulated CPC, ACOS, and ROAS using historical ad spend elasticity and conversion model assumptions. Not a performance guarantee.">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] tracking-wider uppercase font-bold">Model Estimates</span>
                  <span className="text-[8px] text-slate-400 normal-case font-normal font-sans">Simulated CPC • ACOS • ROAS</span>
                </div>
              </th>

              <th 
                className="p-4 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors text-center"
                onClick={() => handleSort("action")}
              >
                <div className="flex items-center justify-center gap-1">
                  Action Recommendation
                  {sortField === "action" && (sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                </div>
              </th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                    <div className="p-3 bg-slate-100 text-slate-400 rounded-full border border-slate-200/50">
                      <Search className="w-5 h-5 text-slate-400" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-800">No matching PPC targets</h4>
                    <p className="text-slate-400 text-xs leading-normal">
                      No keyword rows match your search query or selected active recommendation state. Try widening your search or clearing active filters.
                    </p>
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setActionFilter("ALL");
                        setCurrentPage(1);
                      }}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 text-slate-600 font-semibold rounded-lg text-xs transition cursor-pointer select-none"
                    >
                      Reset active filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRows.map(row => {
                const rec = recommendations[row.id];
                const checked = selectedRowIds.has(row.id);
                
                const curBid = row.currentBid || row.cpc || 1.00;
                const sugBid = rec ? rec.suggestedBid : curBid;
                const isOverridden = rec ? rec.isOverridden : false;
                const isTopPerformer = topPerformersIds.has(row.id);

                // Color code action badge
                let badgeClass = "bg-slate-100 text-slate-700";
                if (rec) {
                  if (rec.action === "SCALE") {
                    badgeClass = "bg-scale-bg text-scale-text border border-emerald-200/50";
                  } else if (rec.action === "REDUCE") {
                    if (rec.reason.toLowerCase().includes("bleeder")) {
                      badgeClass = "bg-reduce-bg text-reduce-text border border-rose-200";
                    } else {
                      badgeClass = "bg-reduce-bg text-reduce-text border border-rose-100/50";
                    }
                  } else if (rec.action === "HOLD") {
                    badgeClass = "bg-hold-bg text-hold-text border border-amber-200/50";
                  }
                }

                return (
                  <React.Fragment key={row.id}>
                    <tr className={`hover:bg-slate-50/50 transition-colors ${
                      isTopPerformer 
                        ? "bg-amber-50/30 border-l-4 border-l-amber-500 font-medium" 
                        : ""
                    } ${checked ? "bg-slate-50/70" : ""} ${expandedRowIds.has(row.id) ? "bg-slate-50/40 border-b-0" : ""}`}>
                      {/* Checkbox */}
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                          className="rounded border-slate-300 focus:ring-brand accent-brand text-brand"
                        />
                      </td>

                      {/* Targeting details */}
                      <td className="p-4 max-w-sm">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-900 tracking-tight break-words">
                            <HighlightText text={row.targeting} highlight={searchTerm} />
                          </span>
                          
                          {isTopPerformer && (
                            <span 
                              className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-black rounded-md shadow-xs animate-pulse select-none"
                              title={`Top Performer - ROAS is in the top 10% of this dataset! ROAS: ${(row.spend > 0 ? row.sales / row.spend : row.sales / 0.01).toFixed(1)}x`}
                            >
                              <Sparkle className="w-2.5 h-2.5 text-amber-600" />
                              <span>TOP PERFORMER</span>
                            </span>
                          )}

                          {row.impressionShare !== undefined && (
                            <span 
                              className={`inline-flex items-center gap-0.5 px-2 py-0.5 text-[9px] font-black rounded-md border tracking-wider uppercase select-none ${
                                row.impressionShare < 25 
                                  ? "bg-amber-50 text-amber-700 border-amber-200" 
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                              }`}
                              title="Top of Search Impression Share"
                            >
                              TOS: {row.impressionShare.toFixed(1)}%
                            </span>
                          )}

                          {row.searchTerms && row.searchTerms.length > 0 && (
                            <button
                              onClick={() => toggleRowExpanded(row.id)}
                              className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 hover:text-emerald-950 text-[10px] font-bold rounded-md transition cursor-pointer select-none border border-emerald-300/30 shadow-3xs"
                            >
                              <span>{row.searchTerms.length} query slices</span>
                              {expandedRowIds.has(row.id) ? (
                                <ChevronUp className="w-2.5 h-2.5" />
                              ) : (
                                <ChevronDown className="w-2.5 h-2.5" />
                              )}
                            </button>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium bg-slate-100 text-slate-500 px-1.5 py-0.25 rounded">{row.matchType || "Broad"}</span>
                          <span className="truncate">
                            <HighlightText text={row.campaign} highlight={searchTerm} />
                          </span>
                          <span>•</span>
                          <span className="truncate">{row.adGroup}</span>
                        </div>
                        
                        {/* Reason text underneath */}
                        {rec && (
                          <div className="text-[10px] text-slate-500 italic mt-1 bg-slate-50 p-1.5 rounded border border-slate-100 leading-normal">
                            {rec.reason}
                          </div>
                        )}
                      </td>

                      {/* Metrics */}
                      <td className="p-4 text-right font-medium">{row.clicks.toLocaleString()}</td>
                      <td className="p-4 text-right font-medium text-slate-500">{(row.ctr * 100).toFixed(2)}%</td>
                      <td className="p-4 text-right font-mono font-bold text-indigo-950/90 bg-indigo-50/10" title="Historical Cost-Per-Click for this target">
                        ${row.cpc.toFixed(2)}
                      </td>
                      <td className="p-4 text-right font-semibold">${row.spend.toFixed(2)}</td>
                      <td className="p-4 text-right font-semibold text-slate-900">${row.sales.toFixed(2)}</td>
                      
                      {/* ACOS details */}
                      <td className="p-4 text-right font-bold">
                        {row.sales > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className={row.acos > 0.40 ? "text-reduce-text" : (row.acos < 0.20 ? "text-scale-text" : "text-slate-800")}>
                              {(row.acos * 100).toFixed(0)}%
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono font-medium whitespace-nowrap">
                              {(row.spend > 0 ? row.sales / row.spend : row.sales / 0.01).toFixed(1)}x ROAS
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Original bid estimate / Custom baseline input */}
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end">
                          <div className="relative inline-block w-20 text-right">
                            <span className="absolute left-1.5 top-1.5 text-slate-400 font-medium font-mono">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={
                                editingValues[`${row.id}-current`] !== undefined
                                  ? editingValues[`${row.id}-current`]
                                  : (curBid === 0 ? "" : Number(curBid).toFixed(2))
                              }
                              onChange={(e) => {
                                const valStr = e.target.value;
                                setEditingValues(prev => ({
                                  ...prev,
                                  [`${row.id}-current`]: valStr
                                }));
                                const val = parseFloat(valStr);
                                if (!isNaN(val)) onCurrentBidChange(row.id, val);
                              }}
                              onBlur={() => {
                                setEditingValues(prev => {
                                  const next = { ...prev };
                                  delete next[`${row.id}-current`];
                                  return next;
                                });
                              }}
                              className="w-full pl-4.5 pr-1.5 py-1 text-xs text-right font-mono font-semibold rounded-md bg-slate-50 border border-slate-200 outline-none focus:ring-1 focus:ring-slate-400 text-slate-700 hover:bg-slate-100/50 focus:bg-white transition-all shadow-3xs"
                              title="Override current baseline bid if it does not match what's live in Amazon Campaign Manager"
                            />
                          </div>
                        </div>
                      </td>

                      {/* Suggested Bid Input column */}
                      <td className="p-4 text-right bg-brand/[0.02] whitespace-nowrap border-l border-slate-100">
                        <div className="flex items-center justify-end gap-1 text-right">
                          {isOverridden && (
                            <button
                              onClick={() => onResetOverride(row.id)}
                              className="p-1 hover:bg-slate-100 rounded-full text-amber-500 hover:text-amber-600 cursor-pointer"
                              title="Reset to formula configuration"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                          <div className="relative inline-block w-20">
                            <span className="absolute left-1.5 top-1.5 text-brand font-bold font-mono">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={
                                editingValues[`${row.id}-suggested`] !== undefined
                                  ? editingValues[`${row.id}-suggested`]
                                  : (sugBid === 0 ? "" : Number(sugBid).toFixed(2))
                              }
                              onChange={(e) => {
                                const valStr = e.target.value;
                                setEditingValues(prev => ({
                                  ...prev,
                                  [`${row.id}-suggested`]: valStr
                                }));
                                const val = parseFloat(valStr);
                                if (!isNaN(val)) onBidOverride(row.id, val);
                              }}
                              onBlur={() => {
                                setEditingValues(prev => {
                                  const next = { ...prev };
                                  delete next[`${row.id}-suggested`];
                                  return next;
                                });
                              }}
                              className={`w-full pl-4.5 pr-1.5 py-1 text-xs text-right font-mono font-bold rounded-md bg-white border border-slate-200 outline-none focus:ring-1 focus:ring-brand ${
                                isOverridden 
                                  ? "border-amber-400 focus:ring-amber-400 text-amber-700 bg-amber-50/10" 
                                  : "text-brand border-brand/20 focus:border-brand"
                              }`}
                            />
                          </div>
                        </div>
                        {row.suggestedBidMedian !== undefined && (
                          <div className="text-[9px] text-slate-400 text-right mt-1.5 leading-tight font-medium select-none">
                            <span className="block text-slate-400 font-sans font-semibold text-[8px] uppercase tracking-wider mb-0.5">Amazon Recommended:</span>
                            <button
                              onClick={() => onBidOverride(row.id, row.suggestedBidMedian!)}
                              className="inline-flex items-center px-1.5 py-0.5 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 font-mono font-extrabold rounded-md border border-indigo-100 text-[10px] transition cursor-pointer"
                              title="Click to instantly auto-override and apply Amazon's median recommended bid"
                            >
                              ${row.suggestedBidMedian.toFixed(2)}
                            </button>
                            {row.suggestedBidLow !== undefined && row.suggestedBidHigh !== undefined && (
                              <span className="block text-[8px] text-slate-400 mt-1 font-mono font-medium">
                                low ${row.suggestedBidLow.toFixed(2)} • high ${row.suggestedBidHigh.toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Projected Impact column */}
                      <td className="p-4 text-right bg-violet-50/5 border-l border-slate-100 font-medium whitespace-nowrap">
                        {(() => {
                          const origBid = row.currentBid || row.cpc || 1.00;
                          const suggBid = rec ? rec.suggestedBid : origBid;
                          const rBidRatio = origBid > 0 ? (suggBid / origBid) : 1;

                          // Projected CPC
                          const projCpc = Math.max(0.02, Math.min(suggBid, row.cpc > 0 ? row.cpc * (1 + (rBidRatio - 1) * 0.75) : suggBid * 0.85));

                          // Projected Spend
                          const rElasticity = 0.75;
                          const rSpendMult = 1 + (rBidRatio - 1) * rElasticity;
                          const projSpend = Math.max(0, row.spend * rSpendMult);

                          // Projected Sales
                          let projSales = row.sales;
                          if (rBidRatio < 1) {
                            projSales = Math.max(0, row.sales * (1 + (rBidRatio - 1) * 0.35));
                          } else {
                            projSales = Math.max(0, row.sales * (1 + (rBidRatio - 1) * 0.55));
                          }

                          const projAcos = projSales > 0 ? (projSpend / projSales) : 0;
                          const projRoas = projSpend > 0 ? (projSales / projSpend) : (projSales > 0 ? projSales / 0.01 : 0);

                          const hasSales = row.sales > 0;

                          return (
                            <div className="flex flex-col items-end gap-0.5" title="Historical data combined with spend elasticity coefficient (e ~ 0.75).">
                              {/* Projected CPC */}
                              <div className="flex items-center gap-1 leading-none">
                                <span className="text-[9px] text-slate-400">Sim. CPC:</span>
                                <span className="font-mono text-slate-700 font-semibold text-[11px]">${projCpc.toFixed(2)}</span>
                              </div>

                              {/* Projected ACOS */}
                              <div className="flex items-center gap-1 leading-none">
                                <span className="text-[9px] text-slate-400">Sim. ACOS:</span>
                                {hasSales ? (
                                  <span className={`font-mono font-bold text-[11px] ${
                                    projAcos > 0.40 ? "text-rose-600" : (projAcos < 0.20 ? "text-emerald-600" : "text-indigo-650")
                                  }`}>
                                    {(projAcos * 100).toFixed(0)}%
                                  </span>
                                ) : (
                                  <span className="font-mono text-slate-400 text-[11px]">-</span>
                                )}
                              </div>

                              {/* Projected ROAS */}
                              <div className="flex items-center gap-1 leading-none">
                                <span className="text-[9px] text-slate-400">Sim. ROAS:</span>
                                {hasSales && projSpend > 0 ? (
                                  <span className="font-mono font-bold text-indigo-750 text-[11px]">
                                    {projRoas.toFixed(1)}x
                                  </span>
                                ) : (
                                  <span className="font-mono text-slate-400 text-[11px]">-</span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Recommendation action badge */}
                      <td className="p-4 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider ${badgeClass}`}>
                          {rec ? rec.action : "HOLD"}
                        </span>
                      </td>
                    </tr>

                    {/* Subtable details for query slices */}
                    {expandedRowIds.has(row.id) && row.searchTerms && row.searchTerms.length > 0 && (
                      <tr className="bg-slate-50/85">
                        <td className="p-0 border-b border-slate-200" colSpan={12}>
                          <div className="px-6 py-4 border-l-4 border-emerald-500 bg-emerald-50/10 whitespace-normal">
                            <div className="flex items-center gap-2 mb-2">
                              <Sparkle className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                                Customer Search Queries Rollup Breakdown ({row.searchTerms.length} slices)
                              </h4>
                            </div>
                            <div className="border border-slate-200/60 rounded-lg overflow-hidden bg-white shadow-3xs max-w-4xl">
                              <table className="w-full text-left border-collapse text-[11px] font-sans">
                                <thead>
                                  <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                                    <th className="p-2.5 pl-4">Raw Customer Search Query</th>
                                    <th className="p-2.5 text-right w-24">Impressions</th>
                                    <th className="p-2.5 text-right w-20">Clicks</th>
                                    <th className="p-2.5 text-right text-indigo-900 w-20 bg-indigo-50/5">CPC</th>
                                    <th className="p-2.5 text-right text-slate-705 w-24">Spend</th>
                                    <th className="p-2.5 text-right text-slate-905 w-24">Sales</th>
                                    <th className="p-2.5 text-right w-20">ACOS</th>
                                    <th className="p-2.5 text-right w-20">Orders</th>
                                    <th className="p-2.5 text-right pr-4 text-emerald-900 bg-emerald-50/10 w-28 font-bold" title="Suggested Bid specifically for this customer search query based on its individual performance metrics and our Target ACOS.">Sugg. Bid</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                                  {row.searchTerms.map((term, tIdx) => {
                                    // Bidding formula calculation for Search Queries Rollup
                                    const matchTypeUpper = (row.matchType || "").toUpperCase();
                                    const targetingLower = (row.targeting || "").toLowerCase();
                                    
                                    const isExact = matchTypeUpper === "EXACT" || targetingLower.includes("[exact]") || targetingLower.includes("exact");
                                    const isBroadOrPhrase = matchTypeUpper === "BROAD" || matchTypeUpper === "PHRASE" || targetingLower.includes("broad") || targetingLower.includes("phrase");
                                    const isAutoTarget = ["loose-match", "close-match", "substitutes", "complements"].includes(targetingLower) || row.matchType === "-";
                                    
                                    const baseAcos = targetAcos || 30;
                                    let queryTargetAcos = baseAcos;
                                    if (isExact) {
                                      queryTargetAcos = baseAcos * 1.10; // Exact match boost (+10%)
                                    } else if (isBroadOrPhrase || isAutoTarget) {
                                      queryTargetAcos = baseAcos * 0.85; // Broad match discount (-15%)
                                    }

                                    const queryCpc = term.clicks > 0 ? (term.spend / term.clicks) : 0;
                                    const currentBid = row.currentBid || row.cpc || 1.00;
                                    
                                    let suggBidVal = currentBid;
                                    let suggReason = "";
                                    let statusColor = "text-slate-600 bg-slate-50/40 border border-slate-200/40";

                                    if (term.clicks === 0) {
                                      suggBidVal = currentBid;
                                      suggReason = "No clicks recorded yet. Maintaining keyword's base bid.";
                                      statusColor = "text-slate-500 bg-slate-50/70 border border-slate-200/50";
                                    } else if (term.orders === 0) {
                                      // Bleeder logic in search terms rollup
                                      if (term.clicks >= 6) {
                                        suggBidVal = Math.max(0.15, queryCpc * 0.60);
                                        suggReason = `Critical Bleeder: ${term.clicks} clicks with no conversions. Reducing bid to 60% of CPC ($${queryCpc.toFixed(2)}) to halt budget leak.`;
                                        statusColor = "text-rose-750 bg-rose-50 text-rose-800 border border-rose-250/30 font-semibold";
                                      } else if (term.clicks >= 3) {
                                        suggBidVal = Math.max(0.20, queryCpc * 0.80);
                                        suggReason = `Weak Signal Bleeder: ${term.clicks} clicks with no conversions. Trimming bid to 80% of CPC ($${queryCpc.toFixed(2)}) to limit risk.`;
                                        statusColor = "text-amber-700 bg-amber-50/50 border border-amber-220/30 font-medium";
                                      } else {
                                        suggBidVal = currentBid;
                                        suggReason = `Observing period: Only ${term.clicks} click(s). Keeping starting targeting bid.`;
                                        statusColor = "text-slate-600 bg-slate-50 border border-slate-200/50";
                                      }
                                    } else {
                                      // Converting query
                                      const queryAcos = term.spend / term.sales;
                                      const queryTargetAcosDec = queryTargetAcos / 100;
                                      const thresholdDec = 0.84 * queryTargetAcosDec;
                                      
                                      if (queryAcos < thresholdDec) {
                                        // Highly efficient, boost CPC by 20% to acquire more impression share
                                        suggBidVal = queryCpc * 1.20;
                                        suggReason = `Highly Efficient! ACOS is ${(queryAcos * 100).toFixed(1)}% (Target: ${Math.round(queryTargetAcos)}%). Boosting average CPC by +20% to scale volume.`;
                                        statusColor = "text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold";
                                      } else {
                                        // Target alignment factor formula
                                        suggBidVal = (queryCpc / queryAcos) * queryTargetAcosDec;
                                        suggReason = `Target Alignment: ACOS is ${(queryAcos * 100).toFixed(1)}% (Target: ${Math.round(queryTargetAcos)}%). Estimating optimal bid as (CPC $${queryCpc.toFixed(2)} / ACOS ${queryAcos.toFixed(3)}) x Target ACOS ${queryTargetAcosDec.toFixed(2)}.`;
                                        statusColor = "text-indigo-700 bg-indigo-50 border border-indigo-150 font-bold";
                                      }
                                      
                                      // Safety clamping to prevent wild actions
                                      suggBidVal = Math.max(0.10, Math.min(Math.max(4.00, currentBid * 2), suggBidVal));
                                    }

                                    return (
                                      <tr key={tIdx} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="p-2.5 pl-4 font-mono text-slate-900 select-all font-semibold break-all">
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <span>{term.term}</span>
                                            {term.clicks > 0 && term.clicks <= 2 && term.orders === 0 && (
                                              <span 
                                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-50 text-slate-400 border border-slate-200/60 text-[8px] font-bold rounded-md select-none cursor-help"
                                                title="Observation phase active. Clicks are low; insufficient evidence to suspect waste."
                                              >
                                                🔍 Observing
                                              </span>
                                            )}
                                            {term.clicks >= 3 && term.clicks <= 5 && term.orders === 0 && (
                                              <span 
                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50/80 text-amber-700 border border-amber-200/65 text-[8px] uppercase font-extrabold rounded-md cursor-help"
                                                title="Weak Waste Signal: This customer search query is eating clicks without a conversion. We recommend monitoring closely before implementing a full exclusion."
                                              >
                                                ⚠️ Weak Waste Signal (Monitor)
                                              </span>
                                            )}
                                            {term.clicks >= 6 && term.orders === 0 && (
                                              <span 
                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200/60 text-[8px] uppercase font-extrabold rounded-md cursor-help animate-pulse"
                                                title="Hard Negative Candidate: Critical budget leakage. Significant clicks with absolutely zero sales. Highly recommended to add as a negative exact keyword in Seller Central."
                                              >
                                                🚨 Hard Negative Candidate (Action!)
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="p-2.5 text-right font-mono text-slate-500">{term.impressions}</td>
                                        <td className="p-2.5 text-right font-mono">{term.clicks}</td>
                                        <td className="p-2.5 text-right font-mono text-indigo-950 font-bold bg-indigo-50/5" title="Calculated Customer Search Query CPC (Spend / Clicks)">
                                          {term.clicks > 0 ? `$${(term.spend / term.clicks).toFixed(2)}` : "$0.00"}
                                        </td>
                                        <td className="p-2.5 text-right font-mono text-slate-700">${term.spend.toFixed(2)}</td>
                                        <td className="p-2.5 text-right font-mono text-slate-950 font-bold">${term.sales.toFixed(2)}</td>
                                        <td className="p-2.5 text-right font-mono font-bold">
                                          {term.sales > 0 ? (
                                            <span className={term.acos > 0.40 ? "text-rose-600" : (term.acos < 0.20 ? "text-emerald-600" : "text-slate-800")}>
                                              {(term.acos * 100).toFixed(0)}%
                                            </span>
                                          ) : (
                                            <span className="text-slate-300 font-normal">-</span>
                                          )}
                                        </td>
                                        <td className="p-2.5 text-right font-mono text-slate-900 font-bold">{term.orders}</td>
                                        <td className="p-2.5 text-right pr-4 bg-emerald-50/10" title={suggReason}>
                                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${statusColor} cursor-help`}>
                                            ${suggBidVal.toFixed(2)}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium mt-2 leading-relaxed">
                              * Amazon logs search terms report slices over time. WesBid aggregate-summed these and calculated real ACOS dynamically so you don't over-bid on high-volume bleeding user searches.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer block */}
      <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-400">
          Showing <span className="font-semibold text-slate-700">{processedRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{" "}
          <span className="font-semibold text-slate-700">{Math.min(currentPage * pageSize, processedRows.length)}</span> of{" "}
          <span className="font-semibold text-slate-700">{processedRows.length}</span> parsed targets.
        </div>

        <div className="flex items-center gap-4">
          {/* Page size pick */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 pr-4 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-brand text-slate-700 text-xs font-semibold"
            >
              {[10, 25, 50, 100].map(sz => (
                <option key={sz} value={sz}>{sz} rows</option>
              ))}
            </select>
          </div>

          {/* Navigation keys */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-slate-200 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-medium text-slate-500 px-2 min-w-16 text-center select-none">
              Pg {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 border border-slate-200 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
