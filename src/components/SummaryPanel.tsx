/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  TrendingUp, 
  Activity, 
  ArrowUpRight, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  DollarSign, 
  Percent 
} from "lucide-react";
import { AmazonPpcRow, BidRecommendation, ScenarioImpact } from "../types";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  Cell 
} from "recharts";

interface SummaryPanelProps {
  rows: AmazonPpcRow[];
  recommendations: Record<string, BidRecommendation>;
  impact: ScenarioImpact;
}

export default function SummaryPanel({ rows, recommendations, impact }: SummaryPanelProps) {
  // Prep chart data for Bid Comparison
  const bidComparisonData = rows.slice(0, 15).map(row => {
    const rec = recommendations[row.id];
    return {
      name: row.targeting.length > 20 ? row.targeting.substring(0, 18) + "..." : row.targeting,
      "Current Bid ($)": Number((row.currentBid || row.cpc || 1.00).toFixed(2)),
      "Suggested Bid ($)": rec ? Number(rec.suggestedBid.toFixed(2)) : Number((row.currentBid || row.cpc || 1.00).toFixed(2)),
    };
  });

  // Action count data for distribution
  const distributionData = [
    { name: "SCALE (Raise)", value: impact.scaleCount, color: "#059669" },
    { name: "HOLD (Stable)", value: impact.holdCount, color: "#d97706" },
    { name: "REDUCE (Lower)", value: Math.max(0, impact.reduceCount - impact.bleederCount), color: "#dc2626" },
    { name: "Bleeders Filtered", value: impact.bleederCount, color: "#94a3b8" }
  ].filter(d => d.value > 0);

  const formattedDifference = impact.estimatedNewSpend - impact.totalOriginalSpend;
  const variancePercent = impact.totalOriginalSpend > 0 
    ? ((impact.estimatedNewSpend - impact.totalOriginalSpend) / impact.totalOriginalSpend) * 100 
    : 0;

  return (
    <div className="space-y-6" id="summary-panel">
      {/* Visual Analytics Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Portfolio Spend */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Original Spend</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">${impact.totalOriginalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="p-2.5 bg-slate-50 text-slate-500 rounded-lg border border-slate-100">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1">
            <span className="font-semibold text-slate-700">{rows.length}</span> parsed active PPC targets.
          </div>
        </div>

        {/* Card 2: Simulated New Spend Impact */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Est. Spend Reallocation</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">${impact.estimatedNewSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className={`p-2.5 rounded-lg border ${
              formattedDifference < 0 
                ? "bg-scale-bg text-scale-text border-emerald-100" 
                : "bg-slate-50 text-slate-600 border-slate-200"
            }`}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-[11px] flex items-center gap-1">
            <span className={`font-semibold flex items-center ${formattedDifference < 0 ? "text-scale-text" : "text-amber-600"}`}>
              {formattedDifference < 0 ? "-" : "+"}${Math.abs(formattedDifference).toFixed(2)} ({variancePercent.toFixed(1)}%)
            </span>
            <span className="text-slate-400">simulated elastic change.</span>
          </div>
        </div>

        {/* Card 3: Bid Price Transition */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Avg. Recommended Bid</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">${impact.suggestedAvgBid.toFixed(2)}</p>
            </div>
            <div className={`p-2.5 rounded-lg border bg-brand/[0.04] text-brand border-brand/20`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-[11px] flex items-center gap-1">
            <span className="text-slate-400">Shifted from</span>
            <span className="font-semibold text-slate-700">${impact.originalAvgBid.toFixed(2)}</span>
            <span className={`font-bold ${impact.bidChangePercent < 0 ? "text-scale-text" : "text-reduce-text"}`}>
              ({impact.bidChangePercent >= 0 ? "+" : ""}{impact.bidChangePercent.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Card 4: Action Status Breakdown */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Active Bleeder Blocks</span>
              <p className="text-2xl font-bold text-reduce-text mt-1">{impact.bleederCount}</p>
            </div>
            <div className="p-2.5 bg-rose-50 text-reduce-text rounded-lg border border-rose-100">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="text-scale-text font-semibold">{impact.scaleCount} Scaled</span>
            <span className="text-hold-text font-semibold">{impact.holdCount} Held</span>
            <span className="text-reduce-text font-semibold">{impact.reduceCount} Reduced</span>
          </div>
        </div>
      </div>

      {/* Two Columns for Visual Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Column 1: Suggested Bid curve */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Bid Adjustment Delta (Top Keywords)</h3>
              <p className="text-slate-400 text-xs mt-0.5">Interactive simulation of the current bid versus Suggested Bid.</p>
            </div>
            <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider">Top 15 Targets</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={bidComparisonData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorCur" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#475569" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#475569" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSug" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#94a3b8', fontSize: 9 }} 
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fill: '#94a3b8', fontSize: 10 }} 
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                  unit="$"
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                <Area type="monotone" dataKey="Current Bid ($)" stroke="#475569" strokeWidth={1.5} fillOpacity={1} fill="url(#colorCur)" />
                <Area type="monotone" dataKey="Suggested Bid ($)" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSug)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart Column 2: Count Breakdown */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Target Distribution</h3>
            <p className="text-slate-400 text-xs mt-0.5">Ratio of portfolio campaigns subject to bid changes.</p>
          </div>

          <div className="h-56 w-full mt-4 flex items-center justify-center">
            {distributionData.length === 0 ? (
              <p className="text-slate-400 text-xs">No active data rows compiled.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={distributionData}
                  layout="vertical"
                  margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fontWeight: 500, fill: '#475569' }} width={95} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }} contentStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="value" name="Key Terms" radius={[0, 4, 4, 0]}>
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 justify-center text-[10px] text-slate-500 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-scale-text" />
            Formula values optimized and responsive to slider limits.
          </div>
        </div>
      </div>
    </div>
  );
}
