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
  AlertTriangle
} from "lucide-react";
import { AmazonPpcRow, BidRecommendation } from "../types";

interface BidTableProps {
  rows: AmazonPpcRow[];
  recommendations: Record<string, BidRecommendation>;
  onBidOverride: (rowId: string, newBid: number) => void;
  onResetOverride: (rowId: string) => void;
  onBulkOverride: (rowIds: string[], multiplier: number) => void;
  onBulkSetAction: (rowIds: string[], action: "SCALE" | "REDUCE" | "HOLD") => void;
}

type SortField = "targeting" | "clicks" | "spend" | "sales" | "acos" | "currentBid" | "suggestedBid" | "action" | "ctr";

export default function BidTable({
  rows,
  recommendations,
  onBidOverride,
  onResetOverride,
  onBulkOverride,
  onBulkSetAction
}: BidTableProps) {
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<"ALL" | "SCALE" | "HOLD" | "REDUCE" | "BLEEDER">("ALL");
  
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
      list = list.filter(r => {
        const rec = recommendations[r.id];
        if (!rec) return false;
        if (actionFilter === "BLEEDER") {
          return rec.action === "REDUCE" && rec.reason.toLowerCase().includes("bleeder");
        }
        return rec.action === actionFilter;
      });
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
  }, [rows, recommendations, searchTerm, actionFilter, sortField, sortAsc]);

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

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs mt-6" id="bidding-cockpit">
      {/* Control Panel: Search & State Filters */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center gap-4 justify-between">
        {/* State filters */}
        <div className="flex gap-1.5 p-1 bg-slate-100 rounded-lg self-start md:self-center overflow-x-auto w-full md:w-auto">
          {(["ALL", "SCALE", "HOLD", "REDUCE", "BLEEDER"] as const).map(f => {
            const label = f === "ALL" 
              ? "All Bids" 
              : f === "SCALE" 
              ? "Scale (Raise)" 
              : f === "HOLD" 
              ? "Hold" 
              : f === "REDUCE" 
              ? "Reduce" 
              : "Bleeders Only";
            
            const activeColor = f === "SCALE" 
              ? "bg-scale-bg text-scale-text border border-emerald-200" 
              : f === "HOLD" 
              ? "bg-hold-bg text-hold-text border border-amber-200" 
              : f === "REDUCE" || f === "BLEEDER"
              ? "bg-reduce-bg text-reduce-text border border-rose-200"
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

        {/* Search */}
        <div className="relative w-full md:w-72">
          <span className="absolute left-3 top-2.5 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search keywords or campaigns..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand bg-white"
            id="table-search"
          />
        </div>
      </div>

      {/* Bulk Toolbar, visible only when selections exist */}
      {selectedRowIds.size > 0 && (
        <div className="bg-slate-900 text-white px-5 py-3 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold bg-brand/10 text-brand border border-brand/20 px-2 py-0.5 rounded-full select-none">
              {selectedRowIds.size} Selected
            </span>
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
                <td colSpan={10} className="p-8 text-center text-slate-400">
                  No matching keywords found for active filters.
                </td>
              </tr>
            ) : (
              paginatedRows.map(row => {
                const rec = recommendations[row.id];
                const checked = selectedRowIds.has(row.id);
                
                const curBid = row.currentBid || row.cpc || 1.00;
                const sugBid = rec ? rec.suggestedBid : curBid;
                const isOverridden = rec ? rec.isOverridden : false;

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
                    <tr className={`hover:bg-slate-50/50 transition-colors ${checked ? "bg-slate-50/70" : ""} ${expandedRowIds.has(row.id) ? "bg-slate-50/40 border-b-0" : ""}`}>
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
                          <span className="font-semibold text-slate-900 tracking-tight break-words">{row.targeting}</span>
                          
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
                          <span className="truncate">{row.campaign}</span>
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
                      <td className="p-4 text-right font-semibold">${row.spend.toFixed(2)}</td>
                      <td className="p-4 text-right font-semibold text-slate-900">${row.sales.toFixed(2)}</td>
                      
                      {/* ACOS details */}
                      <td className="p-4 text-right font-bold">
                        {row.sales > 0 ? (
                          <span className={row.acos > 0.40 ? "text-reduce-text" : (row.acos < 0.20 ? "text-scale-text" : "text-slate-800")}>
                            {(row.acos * 100).toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Original bid estimate */}
                      <td className="p-4 text-right whitespace-nowrap">
                        <span className="font-mono text-slate-500">${curBid.toFixed(2)}</span>
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
                              value={sugBid === 0 ? "" : Number(sugBid).toFixed(2)}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) onBidOverride(row.id, val);
                              }}
                              className={`w-full pl-4.5 pr-1.5 py-1 text-xs text-right font-mono font-bold rounded-md bg-white border border-slate-200 outline-none focus:ring-1 focus:ring-brand ${
                                isOverridden 
                                  ? "border-amber-400 focus:ring-amber-400 text-amber-700 bg-amber-50/10" 
                                  : "text-brand border-brand/20 focus:border-brand"
                              }`}
                            />
                          </div>
                        </div>
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
                        <td className="p-0 border-b border-slate-200" colSpan={10}>
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
                                    <th className="p-2.5 text-right text-slate-705 w-24">Spend</th>
                                    <th className="p-2.5 text-right text-slate-905 w-24">Sales</th>
                                    <th className="p-2.5 text-right w-20">ACOS</th>
                                    <th className="p-2.5 text-right pr-4 w-20">Orders</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                                  {row.searchTerms.map((term, tIdx) => (
                                    <tr key={tIdx} className="hover:bg-slate-50/70 transition-colors">
                                      <td className="p-2.5 pl-4 font-mono text-slate-900 select-all font-semibold break-all">
                                        {term.term}
                                      </td>
                                      <td className="p-2.5 text-right font-mono text-slate-500">{term.impressions}</td>
                                      <td className="p-2.5 text-right font-mono">{term.clicks}</td>
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
                                      <td className="p-2.5 text-right pr-4 font-mono text-slate-900 font-bold">{term.orders}</td>
                                    </tr>
                                  ))}
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
