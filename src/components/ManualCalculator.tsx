import React, { useState, useMemo } from "react";
import { 
  Calculator, 
  Plus, 
  Trash2, 
  Info, 
  TrendingUp, 
  DollarSign, 
  Percent, 
  HelpCircle,
  Copy,
  Check,
  FileSpreadsheet
} from "lucide-react";

interface ManualRow {
  id: string;
  label: string;
  currentAcos: number; // e.g. 109.1
  cpc: number; // e.g. 2.15
  targetAcos: number; // e.g. 50.0
}

export default function ManualCalculator() {
  // Playground single-row states
  const [playCurrentAcos, setPlayCurrentAcos] = useState<number>(109.1);
  const [playCpc, setPlayCpc] = useState<number>(2.15);
  const [playTargetAcos, setPlayTargetAcos] = useState<number>(50.0);
  const [copiedFormula, setCopiedFormula] = useState(false);

  // Scratchpad table list of rows
  const [scratchpadRows, setScratchpadRows] = useState<ManualRow[]>([
    { id: "1", label: "Example Target (Underperforming Exact)", currentAcos: 109.1, cpc: 2.15, targetAcos: 50.0 },
    { id: "2", label: "Example Target (Efficient Broad)", currentAcos: 32.5, cpc: 1.10, targetAcos: 45.0 },
    { id: "3", label: "Example Target (Ultra high margin)", currentAcos: 15.0, cpc: 0.85, targetAcos: 40.0 },
  ]);

  // Scratchpad quick add states
  const [newLabel, setNewLabel] = useState("");
  const [newCurrentAcos, setNewCurrentAcos] = useState<string>("65.0");
  const [newCpc, setNewCpc] = useState<string>("1.50");
  const [newTargetAcos, setNewTargetAcos] = useState<string>("40.0");

  // Excel syntax string for copy
  const excelFormulaText = `=IF(A3<(0.84*C3), B3*1.2, (B3/A3)*C3)`;

  const handleCopyFormula = () => {
    navigator.clipboard.writeText(excelFormulaText);
    setCopiedFormula(true);
    setTimeout(() => setCopiedFormula(false), 2000);
  };

  // Helper calculation function
  const computeNewMaxBid = (currentAcos: number, cpc: number, targetAcos: number) => {
    const acosDecimal = currentAcos / 100;
    const targetAcosDecimal = targetAcos / 100;

    if (acosDecimal <= 0) return 0; // Guard division by zero or invalid input

    // Threshold is 0.84 * Target ACOS
    const threshold = 0.84 * targetAcosDecimal;

    if (acosDecimal < threshold) {
      // Under top performance: boost CPC by +20%
      return cpc * 1.2;
    } else {
      // Target alignment factor: (CPC / ACOS) * Target ACOS
      return (cpc / acosDecimal) * targetAcosDecimal;
    }
  };

  // Compute live playground values
  const playCalculation = useMemo(() => {
    const currentAcosDec = playCurrentAcos / 100;
    const targetAcosDec = playTargetAcos / 100;
    const thresholdDec = 0.84 * targetAcosDec;
    const isUnderThreshold = currentAcosDec < thresholdDec;
    const computedBid = computeNewMaxBid(playCurrentAcos, playCpc, playTargetAcos);

    return {
      thresholdPct: thresholdDec * 100,
      isUnderThreshold,
      computedBid,
      formulaExplanation: isUnderThreshold 
        ? `Since Current ACOS (${playCurrentAcos.toFixed(1)}%) is less than 84% of your Target ACOS (${(thresholdDec * 100).toFixed(1)}%), we trigger high-opportunity scaling: CPC (${playCpc.toFixed(2)}) × 1.2`
        : `Since Current ACOS (${playCurrentAcos.toFixed(1)}%) is at or above the safety limit (${(thresholdDec * 100).toFixed(1)}%), we calculate direct proportional convergence: (CPC $${playCpc.toFixed(2)} / Acos ${currentAcosDec.toFixed(3)}) × Target ${(playTargetAcos / 100).toFixed(2)}`,
      mathStep: isUnderThreshold
        ? `$${playCpc.toFixed(2)} × 1.20 = $${computedBid.toFixed(2)}`
        : `($${playCpc.toFixed(2)} / ${(playCurrentAcos / 100).toFixed(4)}) × ${(playTargetAcos / 100).toFixed(2)} = $${computedBid.toFixed(2)}`
    };
  }, [playCurrentAcos, playCpc, playTargetAcos]);

  // Handle Scratchpad Dynamic Row Creation
  const handleAddRow = (e: React.FormEvent) => {
    e.preventDefault();
    const acosVal = parseFloat(newCurrentAcos) || 0;
    const cpcVal = parseFloat(newCpc) || 0;
    const targetVal = parseFloat(newTargetAcos) || 30;

    if (acosVal <= 0 || cpcVal <= 0) {
      alert("Please provide valid positive numbers for ACOS % and CPC $");
      return;
    }

    const itemLabel = newLabel.trim() || `Manual Entry #${scratchpadRows.length + 1}`;

    const newRowItem: ManualRow = {
      id: Date.now().toString(),
      label: itemLabel,
      currentAcos: acosVal,
      cpc: cpcVal,
      targetAcos: targetVal
    };

    setScratchpadRows(prev => [...prev, newRowItem]);
    setNewLabel("");
  };

  const handleDeleteRow = (id: string) => {
    setScratchpadRows(prev => prev.filter(row => row.id !== id));
  };

  return (
    <div className="space-y-6" id="manual-calculator-tab">
      
      {/* 2-Column top section representing Playgrounds and Logic cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Interactive Live Playground Slider Block: col-6 */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                  <Calculator className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Live Single-Target Sandbox</h3>
              </div>
              <span className="text-[10px] bg-indigo-100/60 text-indigo-700 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider select-none animate-pulse">
                Interactive Formula
              </span>
            </div>

            <div className="space-y-5">
              {/* Variable A: Current ACOS Slider & Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-slate-400" />
                    Current ACOS
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="number"
                      step="0.1"
                      min="1"
                      max="400"
                      value={playCurrentAcos}
                      onChange={(e) => setPlayCurrentAcos(Math.max(0.1, Number(e.target.value)))}
                      className="w-16 px-1.5 py-0.5 rounded text-right text-xs font-bold font-mono bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-500" 
                    />
                    <span className="text-slate-500 font-bold font-mono">%</span>
                  </div>
                </div>
                <input 
                  type="range"
                  min="2"
                  max="250"
                  step="0.5"
                  value={playCurrentAcos}
                  onChange={(e) => setPlayCurrentAcos(Number(e.target.value))}
                  className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-ew-resize"
                />
              </div>

              {/* Variable B: Cost-Per-Click Slider / Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    CPC (Cost-Per-Click)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="20"
                      value={playCpc}
                      onChange={(e) => setPlayCpc(Math.max(0.01, Number(e.target.value)))}
                      className="w-16 px-1.5 py-0.5 rounded text-right text-xs font-bold font-mono bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-500" 
                    />
                    <span className="text-slate-500 font-bold text-xs font-sans">USD</span>
                  </div>
                </div>
                <input 
                  type="range"
                  min="0.10"
                  max="8.00"
                  step="0.05"
                  value={playCpc}
                  onChange={(e) => setPlayCpc(Number(e.target.value))}
                  className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-ew-resize"
                />
              </div>

              {/* Variable C: Target ACOS Slider / Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                    Target ACOS
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="number"
                      step="1"
                      min="5"
                      max="150"
                      value={playTargetAcos}
                      onChange={(e) => setPlayTargetAcos(Math.max(1, Number(e.target.value)))}
                      className="w-16 px-1.5 py-0.5 rounded text-right text-xs font-bold font-mono bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-500" 
                    />
                    <span className="text-slate-500 font-bold font-mono">%</span>
                  </div>
                </div>
                <input 
                  type="range"
                  min="5"
                  max="120"
                  step="1"
                  value={playTargetAcos}
                  onChange={(e) => setPlayTargetAcos(Number(e.target.value))}
                  className="w-full accent-emerald-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-ew-resize"
                />
              </div>
            </div>
          </div>

          {/* Result Output Display Panel */}
          <div className="mt-6 bg-slate-50 rounded-xl p-4 border border-slate-150 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Calculated Bid State</span>
                <p className="text-2xl font-black font-sans text-slate-900 tracking-tight flex items-baseline">
                  <span className="text-slate-400 text-lg font-bold mr-0.5">$</span>
                  {playCalculation.computedBid.toFixed(2)}
                  <span className="text-[10px] font-bold text-slate-500 uppercase ml-2 tracking-wide font-sans">
                    New Max Bid Limit
                  </span>
                </p>
              </div>
              <div className="shrink-0">
                {playCalculation.isUnderThreshold ? (
                  <span className="inline-flex px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold uppercase tracking-wider select-none">
                    🚀 UNDER TARGET (+20% SCALE)
                  </span>
                ) : (
                  <span className="inline-flex px-2.5 py-1 rounded bg-indigo-55 bg-indigo-600 border border-indigo-750 text-white text-[10px] font-bold uppercase tracking-wider select-none">
                    🎯 DIRECT CONVERGENCE ADJUSTED
                  </span>
                )}
              </div>
            </div>

            {/* Micro Math proof explanation block */}
            <div className="mt-3.5 border-t border-slate-200/80 pt-3 text-xs leading-relaxed text-slate-650">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Step-by-Step Proof</span>
              <p className="font-semibold text-slate-700">{playCalculation.formulaExplanation}</p>
              
              <div className="mt-2.5 p-2 bg-white rounded border border-slate-100 font-mono text-[11px] font-bold text-indigo-900 flex justify-between items-center sm:w-auto">
                <span>{playCalculation.mathStep}</span>
                <span className="text-[9px] text-slate-400 uppercase font-sans font-extrabold px-1.5 py-0.5 bg-slate-50 rounded select-none">
                  Output Result
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Math Blueprint Formula card: col-5 */}
        <div className="lg:col-span-5 bg-slate-900 text-white rounded-xl p-5 sm:p-6 flex flex-col justify-between border border-slate-800 shadow-md">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-2">
              <div className="p-1 px-2.5 bg-emerald-700 text-white font-mono text-[10px] font-black rounded-md uppercase">
                =IF()
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Formula Specification</h3>
                <p className="text-[10px] text-slate-400">Chronological Conversion Safety Logic</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-semibold">
              The spreadsheet formula dynamically regulates target bids based on safety gates. It prevents hyper-volatility spikes on low-COS products while enforcing exact corrections on bleeders:
            </p>

            <div className="p-3 bg-slate-800/90 border border-slate-700/60 rounded-lg space-y-2 select-all">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase font-sans tracking-wider">Excel / Sheets Equivalent Code</span>
                <button 
                  onClick={handleCopyFormula}
                  className="text-slate-400 hover:text-white transition flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                  title="Copy formula text to clipboard"
                >
                  {copiedFormula ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400 animate-scale-in" />
                      <span className="text-emerald-400 font-sans">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span className="font-sans">Copy Syntax</span>
                    </>
                  )}
                </button>
              </div>
              <p className="font-mono text-xs text-emerald-350 font-bold text-emerald-450 leading-tight">
                {excelFormulaText}
              </p>
            </div>

            {/* Variables Key list */}
            <div className="space-y-2 bg-slate-850/40 p-3 rounded-lg border border-slate-800/40 text-[11px] font-medium leading-normal text-slate-300">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Cell Variables Key Definition</span>
              
              <div className="flex items-start gap-1 p-0.5">
                <span className="font-mono text-emerald-400 font-bold uppercase min-w-8">A3</span>
                <span>= <strong className="text-white font-bold">Current ACOS %</strong> (Spend / Sales ratio of target)</span>
              </div>
              <div className="flex items-start gap-1 p-0.5 border-t border-slate-800/50">
                <span className="font-mono text-emerald-400 font-bold uppercase min-w-8">B3</span>
                <span>= <strong className="text-white font-bold">CPC (Cost-per-Click)</strong> (Calculated average cost)</span>
              </div>
              <div className="flex items-start gap-1 p-0.5 border-t border-slate-800/50">
                <span className="font-mono text-emerald-400 font-bold uppercase min-w-8">C3</span>
                <span>= <strong className="text-white font-bold">Target ACOS %</strong> (Expected conversion efficiency boundary)</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-800/80 text-[10px] text-slate-400 leading-normal font-semibold">
            <span className="text-indigo-400 font-extrabold uppercase tracking-wide block mb-1">💡 Optimization Philosophy</span>
            If ACOS is highly efficient (&lt;84% of target), bid is safely set to 1.2x CPC. If above safety limit, we scale back proportionally to drive convergence.
          </div>
        </div>

      </div>

      {/* Multi-Row Scratchpad Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-5">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Scratchpad Simulation Table
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">Add multiple keyword targets to run batch calculations instantly</p>
          </div>
          <span className="text-[10px] px-2.5 py-1 bg-slate-100 text-slate-650 rounded-lg font-bold select-none">
            {scratchpadRows.length} Targets Active
          </span>
        </div>

        {/* Quick Row creation form */}
        <form onSubmit={handleAddRow} className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 mb-6 grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
          <div className="md:col-span-3 space-y-1">
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide block">Keyword / Target Label</label>
            <input 
              type="text" 
              placeholder="e.g. delivery box sign"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 placeholder:text-slate-400"
            />
          </div>

          <div className="md:col-span-2.5 sm:grid sm:grid-cols-3 md:col-span-6 grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide block">Current ACOS %</label>
              <input 
                type="number" 
                step="0.1"
                min="0.1"
                placeholder="109.1"
                value={newCurrentAcos}
                onChange={(e) => setNewCurrentAcos(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide block">CPC $</label>
              <input 
                type="number" 
                step="0.01"
                min="0.01"
                placeholder="2.15"
                value={newCpc}
                onChange={(e) => setNewCpc(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide block">Target ACOS %</label>
              <input 
                type="number" 
                step="0.5"
                min="1"
                placeholder="50.0"
                value={newTargetAcos}
                onChange={(e) => setNewTargetAcos(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <button 
              type="submit"
              className="w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs select-none"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Keyword to Calc</span>
            </button>
          </div>
        </form>

        {/* Scratchpad Row render table layout */}
        {scratchpadRows.length > 0 ? (
          <div className="overflow-x-auto border border-slate-150 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-450 uppercase tracking-wider select-none">
                  <th className="px-5 py-3 text-slate-550">Target Name / Descriptor</th>
                  <th className="px-5 py-3 text-slate-550 text-center">Current ACOS (A3)</th>
                  <th className="px-5 py-3 text-slate-550 text-center">CPC (B3)</th>
                  <th className="px-5 py-3 text-slate-550 text-center">Target ACOS (C3)</th>
                  <th className="px-5 py-3 text-indigo-700">New Max Bid Formula Result</th>
                  <th className="px-5 py-3 text-slate-550 text-center">Methodology Reason</th>
                  <th className="px-5 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {scratchpadRows.map((row) => {
                  const resultBid = computeNewMaxBid(row.currentAcos, row.cpc, row.targetAcos);
                  const isUnder = (row.currentAcos / 100) < (0.84 * (row.targetAcos / 100));

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/30 transition">
                      
                      {/* Name Col */}
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-800 max-w-sm truncate">{row.label}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase">Simulated Row Input</p>
                      </td>

                      {/* Current Acos (A3) */}
                      <td className="px-5 py-3.5 text-center font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded ${row.currentAcos > 100 ? "bg-rose-50 text-rose-700 font-extrabold" : "bg-slate-100 text-slate-800"}`}>
                          {row.currentAcos.toFixed(1)}%
                        </span>
                      </td>

                      {/* CPC (B3) */}
                      <td className="px-5 py-3.5 text-center font-mono font-semibold text-slate-800">
                        ${row.cpc.toFixed(2)}
                      </td>

                      {/* Target Acos (C3) */}
                      <td className="px-5 py-3.5 text-center font-mono font-bold text-slate-800">
                        {row.targetAcos.toFixed(1)}%
                      </td>

                      {/* Result */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-slate-900 text-sm">
                            ${resultBid.toFixed(2)}
                          </span>
                          {isUnder ? (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[9px] font-extrabold uppercase select-none border border-amber-100 shrink-0">
                              +20% Boost
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-extrabold uppercase select-none border border-indigo-100 shrink-0">
                              Proportional
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Math Strategy Descriptor Reason */}
                      <td className="px-5 py-3.5 text-slate-550 font-medium max-w-xs leading-normal">
                        {isUnder ? (
                          <span className="text-[11px] text-amber-800 leading-snug">
                            Current ACOS &lt; 84% limit. Generates safe scale of <strong className="font-bold">CPC $${row.cpc.toFixed(2)} × 1.2</strong> to grow volume.
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-600 leading-snug">
                            Above safety threshold. Converges using <strong className="font-bold">($${row.cpc.toFixed(2)} / {(row.currentAcos / 100).toFixed(3)}) × {(row.targetAcos / 100).toFixed(2)}</strong>.
                          </span>
                        )}
                      </td>

                      {/* Delete Action button */}
                      <td className="px-5 py-3.5 text-center select-none">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row.id)}
                          className="p-1 px-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                          title="Delete row from sandbox simulator"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 shadow-3xs">
            <Calculator className="w-8 h-8 text-slate-350 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600 mb-0.5">Your Scratchpad Simulation Table is Empty</p>
            <p className="text-[11px] text-slate-400">Add custom keyword parameters above to compute their targets side-by-side!</p>
          </div>
        )}
      </div>

    </div>
  );
}
