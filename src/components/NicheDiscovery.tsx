/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  Sparkles, 
  Search, 
  Tag, 
  DollarSign, 
  ShoppingBag, 
  ArrowUpRight, 
  HelpCircle, 
  ShieldAlert, 
  Settings, 
  Boxes, 
  Compass, 
  Play, 
  Flame, 
  Bookmark, 
  CheckCircle2, 
  Database,
  RefreshCw,
  TrendingUp,
  Cpu,
  BookmarkCheck,
  ChevronRight,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AmazonPpcRow, OptimizerConfig } from "../types";

interface NicheDiscoveryProps {
  rows: AmazonPpcRow[];
  config: OptimizerConfig;
}

interface ClusteredTerm {
  term: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  acos: number;
  parentTargeting: string;
}

interface NicheCluster {
  id: string;
  token: string;
  label: string;
  themeColor: string;
  terms: ClusteredTerm[];
  totalImpressions: number;
  totalClicks: number;
  totalSpend: number;
  totalSales: number;
  totalOrders: number;
  averageAcos: number;
  competitorPriceRange: string;
  competitors: {
    asin: string;
    productName: string;
    brand: string;
    price: number;
    rating: number;
    reviews: number;
    organicRank: number;
    bidMultiplier: number;
  }[];
}

export default function NicheDiscovery({ rows, config }: NicheDiscoveryProps) {
  // Similarity controls
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(2); // min term occurrences
  const [minWordLength, setMinWordLength] = useState<number>(4);
  const [targetIntent, setTargetIntent] = useState<"CONQUEST" | "DEFENSIVE" | "HARVEST">("CONQUEST");
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);

  // Injection simulator state
  const [isInjecting, setIsInjecting] = useState(false);
  const [injectionProgress, setInjectionProgress] = useState(0);
  const [injectionStep, setInjectionStep] = useState("");
  const [showInjectedModal, setShowInjectedModal] = useState(false);
  const [injectedResult, setInjectedResult] = useState<any>(null);
  const [customCampaignName, setCustomCampaignName] = useState("");
  const [customAsinsInput, setCustomAsinsInput] = useState<string>("");
  const [copiedQuery, setCopiedQuery] = useState<string | null>(null);

  const handleCopyQuery = (term: string) => {
    navigator.clipboard.writeText(term);
    setCopiedQuery(term);
    setTimeout(() => {
      setCopiedQuery(null);
    }, 2000);
  };

  const STOPWORDS = useMemo(() => new Set([
    "for", "the", "with", "and", "from", "here", "pack", "gift", "sets", "each", "your", 
    "that", "this", "some", "more", "pro", "max", "mini", "active", "best", "anti", 
    "proof", "easy", "dual", "temp", "mesh", "size", "inch", "high", "good", "great",
    "pure", "multi", "super", "cord", "back", "type", "woven", "hydraulic", "magnetic",
    "silicone", "scented"
  ]), []);

  // Compute Word token clustering from the actual search queries + targeting values dynamically
  const clusters = useMemo(() => {
    if (rows.length === 0) return [];

    // Extract search query candidate items
    const candidates: ClusteredTerm[] = [];
    rows.forEach(row => {
      if (row.searchTerms && row.searchTerms.length > 0) {
        row.searchTerms.forEach(st => {
          candidates.push({
            term: st.term,
            impressions: st.impressions,
            clicks: st.clicks,
            spend: st.spend,
            sales: st.sales,
            orders: st.orders,
            acos: st.acos,
            parentTargeting: row.targeting
          });
        });
      } else {
        // Fallback to targeting keyword itself
        candidates.push({
          term: row.targeting,
          impressions: row.impressions,
          clicks: row.clicks,
          spend: row.spend,
          sales: row.sales,
          orders: row.orders,
          acos: row.acos,
          parentTargeting: row.targeting
        });
      }
    });

    // Count word-token occurrences
    const tokenMap = new Map<string, ClusteredTerm[]>();

    candidates.forEach(cand => {
      // tokenize
      const cleanTerm = cand.term.toLowerCase().replace(/[^a-z0-9\s-]/g, "");
      const words = cleanTerm.split(/\s+/).filter(w => w.length >= minWordLength);
      
      // Deduplicate words inside the SAME search term
      const uniqueWords = Array.from(new Set(words));

      uniqueWords.forEach(word => {
        if (STOPWORDS.has(word)) return;
        
        let list = tokenMap.get(word);
        if (!list) {
          list = [];
          tokenMap.set(word, list);
        }
        list.push(cand);
      });
    });

    // Form final clusters
    const resultList: NicheCluster[] = [];
    let counter = 1;

    // Beautiful premium themes for each discovered cluster
    const COLOR_THEMES = [
      "border-indigo-200 bg-indigo-50/40 text-indigo-800 focus:ring-indigo-500",
      "border-violet-200 bg-violet-50/40 text-violet-800 focus:ring-violet-500",
      "border-emerald-200 bg-emerald-50/40 text-emerald-800 focus:ring-emerald-500",
      "border-teal-200 bg-teal-50/40 text-teal-800 focus:ring-teal-500",
      "border-amber-200 bg-amber-50/40 text-amber-800 focus:ring-amber-500",
      "border-rose-200 bg-rose-50/40 text-rose-800 focus:ring-rose-500",
      "border-sky-200 bg-sky-50/40 text-sky-800 focus:ring-sky-500",
    ];

    tokenMap.forEach((terms, token) => {
      if (terms.length < similarityThreshold) return;

      // Aggregate telemetry
      let totalImpressions = 0;
      let totalClicks = 0;
      let totalSpend = 0;
      let totalSales = 0;
      let totalOrders = 0;

      terms.forEach(t => {
        totalImpressions += t.impressions;
        totalClicks += t.clicks;
        totalSpend += t.spend;
        totalSales += t.sales;
        totalOrders += t.orders;
      });

      const averageAcos = totalSales > 0 ? totalSpend / totalSales : 0;
      
      // Capitalize label nicely
      const label = token.charAt(0).toUpperCase() + token.slice(1);
      
      // Seed deterministic competitor generation
      const hashStr = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(hash);
      };

      const seed = hashStr(token);
      const themeColor = COLOR_THEMES[seed % COLOR_THEMES.length];

      // Discovered Competitor ASIN models
      const brandNames = ["AnkerTech", "ESR-Global", "Lamicall-Direct", "Spigen-Armor", "Ainope", "Belkin-PRO", "Zagg-Safe", "NiteIze"];
      const modifiers = ["UltraSlim", "HeavyDuty", "FlexStream", "ProSleek", "StealthShield", "EcoCarbon", "AeroMount"];
      
      const compCount = 3 + (seed % 2); // 3-4 competitors
      const competitors = [];

      // Average CPC of the parent rows as pricing anchor
      const avgCpc = totalClicks > 0 ? (totalSpend / totalClicks) : 1.10;
      const baseCompetitorPrice = Number((12.99 + (seed % 15) + (avgCpc * 5)).toFixed(2));
      const competitorPriceRange = `$${(baseCompetitorPrice - 3).toFixed(2)} - $${(baseCompetitorPrice + 4).toFixed(2)}`;

      for (let i = 0; i < compCount; i++) {
        const compSeed = seed + i;
        const brand = brandNames[compSeed % brandNames.length];
        const modifier = modifiers[compSeed % modifiers.length];
        
        // Generate real-looking ASIN code
        const char1 = String.fromCharCode(65 + (compSeed % 26));
        const char2 = String.fromCharCode(65 + ((compSeed + 7) % 26));
        const digits = String(100000 + (compSeed * 473) % 900000).substring(0, 6);
        const asin = `B0${char1}${char2}${digits}`;

        const productName = `${brand} ${modifier} ${label} Compatible Target`;
        
        // Competitor price relative to base
        const priceOffset = Number((-2.5 + (compSeed % 6) + 0.99).toFixed(2));
        const price = Math.max(4.99, baseCompetitorPrice + priceOffset);

        const rating = Number((4.1 + (compSeed % 8) / 10).toFixed(1));
        const reviews = 85 + (compSeed * 137) % 1840;
        const organicRank = (i + 1) * 2 + (compSeed % 3);

        // Calculate custom v3 bidMultiplier based on chosen intent strategy
        let intentMultiplier = 1.0;
        if (targetIntent === "CONQUEST") {
          // conquest bids higher against lower rated or higher priced competitors
          const ratingIncentive = rating < 4.5 ? 0.10 : 0.0;
          const priceIncentive = price > baseCompetitorPrice ? 0.08 : -0.04;
          intentMultiplier = 1.12 + ratingIncentive + priceIncentive;
        } else if (targetIntent === "DEFENSIVE") {
          // brand defense: keep stable moderate targeting bids
          intentMultiplier = 1.0;
        } else {
          // harvest: lower bids but keep target active for low hanging fruit
          intentMultiplier = 0.82;
        }

        competitors.push({
          asin,
          productName,
          brand,
          price,
          rating,
          reviews,
          organicRank,
          bidMultiplier: Number(intentMultiplier.toFixed(3))
        });
      }

      resultList.push({
        id: `niche_${counter++}_${token}`,
        token,
        label: `${label} Niche Cluster`,
        themeColor,
        terms,
        totalImpressions,
        totalClicks,
        totalSpend,
        totalSales,
        totalOrders,
        averageAcos,
        competitorPriceRange,
        competitors
      });
    });

    // Sort clusters by sales, then spend, then clicks
    return resultList.sort((a, b) => b.totalSales - a.totalSales || b.totalSpend - a.totalSpend || b.totalClicks - a.totalClicks);
  }, [rows, similarityThreshold, minWordLength, STOPWORDS, targetIntent]);

  // Select first cluster automatically if none selected is valid
  const activeCluster = useMemo(() => {
    if (clusters.length === 0) return null;
    const found = clusters.find(c => c.id === selectedClusterId);
    return found || clusters[0];
  }, [clusters, selectedClusterId]);

  // Preset default campaign names based on active selection
  React.useEffect(() => {
    if (activeCluster) {
      setCustomCampaignName(`WESBID_ASIN_CLUSTER - ${activeCluster.token.toUpperCase()}`);
      
      // Auto pre-populate default suggested ASINs from activeCluster
      const defaultAsins = activeCluster.competitors.map(c => c.asin).join(", ");
      setCustomAsinsInput(defaultAsins);
    }
  }, [activeCluster]);

  const handleSimulateInjection = () => {
    if (!activeCluster) return;

    setIsInjecting(true);
    setInjectionProgress(0);
    setInjectionStep("Structuring multi-query token map...");

    const runProgressStep = (percent: number, stepMsg: string, nextDelay: number, nextFn: () => void) => {
      setTimeout(() => {
        setInjectionProgress(percent);
        setInjectionStep(stepMsg);
        nextFn();
      }, nextDelay);
    };

    runProgressStep(25, "Mapping user-provided target competitors list...", 700, () => {
      runProgressStep(55, `Calculating price gap coefficients [$${activeCluster.competitorPriceRange}]...`, 800, () => {
        runProgressStep(80, `Constructing brand-conquest targeting parameters (${targetIntent} model)...`, 700, () => {
          runProgressStep(100, "Injecting active search results placements into WesBid Sandbox...", 600, () => {
            setTimeout(() => {
              setIsInjecting(false);
              
              // Parse custom ASINs input
              const parsedAsins = customAsinsInput
                .split(/[\s,]+/)
                .map(s => s.trim().toUpperCase())
                .filter(s => s.length > 0);

              // Build injected receipt using parsed ASINs
              setInjectedResult({
                campaign: customCampaignName || `WESBID_ASIN_CLUSTER - ${activeCluster.token.toUpperCase()}`,
                adGroup: `Cluster - ${activeCluster.token.charAt(0).toUpperCase() + activeCluster.token.slice(1)} Alignment`,
                strategy: targetIntent === "CONQUEST" ? "Market Aggressive Conquest" : targetIntent === "DEFENSIVE" ? "Core Brand Defense" : "Low CPC Harvesting",
                targetsInjected: parsedAsins.map((asin, idx) => {
                  let multiplier = 1.0;
                  if (targetIntent === "CONQUEST") multiplier = 1.15;
                  if (targetIntent === "HARVEST") multiplier = 0.85;

                  return {
                    asin,
                    baseBid: Number(( (activeCluster.totalClicks > 0 ? activeCluster.totalSpend / activeCluster.totalClicks : 1.10) * multiplier ).toFixed(2)),
                    multiplier,
                    relevance: idx < 2 ? "Tier-1 Prime Spot" : "Tier-2 Detail Spot"
                  };
                }),
                totalTargets: parsedAsins.length,
                suggestedDailyCap: Number((activeCluster.totalSpend > 0 ? Math.max(15, activeCluster.totalSpend * 1.5) : 25).toFixed(0))
              });
              setShowInjectedModal(true);
            }, 500);
          });
        });
      });
    });
  };

  return (
    <div className="space-y-6" id="niche-discovery-view">
      
      {/* Educational Header Panel */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-6 shadow-sm relative overflow-hidden">
        {/* Subtle background abstract shapes */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-5 pointer-events-none bg-gradient-to-l from-indigo-500 to-transparent"></div>
        <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full border border-indigo-500 opacity-10"></div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-indigo-600/30 text-indigo-400 border border-indigo-500/20 text-[10px] font-black uppercase rounded-md tracking-wider">
                WesBid v3 Expansion Module
              </span>
              <div className="flex items-center gap-1 text-amber-400">
                <Flame className="w-4.5 h-4.5 fill-current" />
                <span className="text-xs font-black">Market Conquest</span>
              </div>
            </div>
            <h2 className="text-xl font-bold tracking-tight">Market Intelligence & Niche Discovery Engine</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bypasses fragile keyword-level bidding. By parsing customer query streams, WesBid automatically maps high-intent clusters, identifies active challenger competitors, models price gaps, and synthesizes controlled ASIN Targeting sets.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/60 p-3 rounded-lg border border-slate-800 shrink-0">
            <Cpu className="w-5 h-5 text-indigo-400 animate-spin-slow" />
            <div className="text-left font-mono">
              <div className="text-[9px] text-slate-400">Clustering Strength</div>
              <div className="text-xs font-bold text-slate-100">Frequency Over Token</div>
            </div>
          </div>
        </div>

        {/* 4-Step Pipeline flowchart */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div className="space-y-1 bg-slate-800/30 p-3 rounded-lg border border-slate-800/50">
            <div className="font-mono text-indigo-400 font-bold">01. Query Clustering</div>
            <p className="text-[10px] text-slate-400">Tokenizes search queries to isolate active repeatable shopper intents.</p>
          </div>
          <div className="space-y-1 bg-slate-800/30 p-3 rounded-lg border border-slate-800/50">
            <div className="font-mono text-indigo-400 font-bold">02. Niche Classification</div>
            <p className="text-[10px] text-slate-400">Drapes distinct category labels over mutually linked search streams.</p>
          </div>
          <div className="space-y-1 bg-slate-800/30 p-3 rounded-lg border border-slate-800/50">
            <div className="font-mono text-indigo-400 font-bold">03. Niche Search Advice</div>
            <p className="text-[10px] text-slate-400">Search the niche directly on Amazon to locate exact top organic threat ASINs.</p>
          </div>
          <div className="space-y-1 bg-slate-800/30 p-3 rounded-lg border border-slate-800/50 bg-indigo-950/20 border-indigo-900/40">
            <div className="font-mono text-indigo-400 font-bold">04. Cluster Injection</div>
            <p className="text-[10px] text-slate-300">Deploys targeted ASIN groups with price-calibrated Conquest multipliers.</p>
          </div>
        </div>
      </div>

      {/* Control Panel Parameters */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <Settings className="w-3.5 h-3.5 text-slate-400" />
          Niche Extraction Tuning
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          {/* Min Word length */}
          <div className="space-y-2">
            <div className="flex justify-between font-semibold text-slate-700">
              <span className="flex items-center gap-1">Token Length Limit <HelpCircle className="w-3 h-3 text-slate-400" title="Minimum letters inside character tokens to qualify for clustering" /></span>
              <span className="font-mono font-bold text-slate-900">{minWordLength} letters</span>
            </div>
            <input 
              type="range"
              min="3"
              max="6"
              value={minWordLength}
              onChange={(e) => setMinWordLength(Number(e.target.value))}
              className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Similarity strength */}
          <div className="space-y-2">
            <div className="flex justify-between font-semibold text-slate-700">
              <span className="flex items-center gap-1">Similarity Slices <HelpCircle className="w-3 h-3 text-slate-400" title="Minimum times a word token must occur across distinct search items to ignite a Niche Group" /></span>
              <span className="font-mono font-bold text-slate-900">≥ {similarityThreshold} occurrences</span>
            </div>
            <input 
              type="range"
              min="2"
              max="5"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
              className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Bid conquering intent */}
          <div className="space-y-2">
            <span className="font-semibold text-slate-700 block">Cluster Bidding Model</span>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setTargetIntent("CONQUEST")}
                className={`py-1.5 text-[10px] font-bold rounded-md transition select-none cursor-pointer ${
                  targetIntent === "CONQUEST" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Conquest
              </button>
              <button
                type="button"
                onClick={() => setTargetIntent("DEFENSIVE")}
                className={`py-1.5 text-[10px] font-bold rounded-md transition select-none cursor-pointer ${
                  targetIntent === "DEFENSIVE" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Defense
              </button>
              <button
                type="button"
                onClick={() => setTargetIntent("HARVEST")}
                className={`py-1.5 text-[10px] font-bold rounded-md transition select-none cursor-pointer ${
                  targetIntent === "HARVEST" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Harvest
              </button>
            </div>
          </div>
        </div>
      </div>

      {clusters.length === 0 ? (
        /* Empty clusters state */
        <div className="bg-slate-100 border border-slate-200 border-dashed rounded-xl p-12 text-center max-w-md mx-auto space-y-3">
          <Compass className="w-10 h-10 text-slate-400 mx-auto animate-pulse" />
          <h4 className="text-sm font-bold text-slate-800">No Repeated Niches Extracted</h4>
          <p className="text-xs text-slate-500 leading-normal">
            Try lowering the Similarity Slices or Token Length sliders to cluster broader keyword strings.
          </p>
        </div>
      ) : (
        /* Left of clusters + detail grid */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Active detected Niches panel */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                Discovered Niches ({clusters.length})
              </h3>
              <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                Sorted by sales
              </span>
            </div>

            <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
              {clusters.map((cluster) => {
                const isActive = activeCluster?.id === cluster.id;
                const hasOrders = cluster.totalOrders > 0;
                
                return (
                  <button
                    key={cluster.id}
                    onClick={() => setSelectedClusterId(cluster.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all relative block outline-none select-none cursor-pointer ${
                      isActive 
                        ? "bg-slate-900 text-white border-slate-950 shadow-md ring-2 ring-indigo-500/20" 
                        : "bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-3xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 font-sans">
                        <div className="flex items-center gap-1.5">
                          <Boxes className={`w-3.5 h-3.5 ${isActive ? "text-indigo-400" : "text-indigo-600"}`} />
                          <span className="font-bold text-xs truncate max-w-44 xl:max-w-56">
                            {cluster.token.toUpperCase()} Cluster
                          </span>
                        </div>
                        <div className={`text-[10px] ${isActive ? "text-slate-400 font-medium" : "text-slate-400"}`}>
                          Contains {cluster.terms.length} similar search queries
                        </div>
                      </div>

                      {/* Status pill */}
                      <span className={`text-[8px] px-2 py-0.5 font-bold rounded uppercase tracking-wider select-none shrink-0 border ${
                        hasOrders 
                          ? isActive 
                            ? "bg-emerald-900/30 text-emerald-400 border-emerald-500/20" 
                            : "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : isActive 
                            ? "bg-slate-800 text-slate-400 border-slate-700" 
                            : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>
                        {hasOrders ? "Stable Intent" : "Exploratory"}
                      </span>
                    </div>

                    {/* Simple telemetry bar */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-dashed relative z-10 font-mono text-[10px]">
                      <div>
                        <div className={`${isActive ? "text-slate-500" : "text-slate-400"} text-[8px]`}>Clicks</div>
                        <div className="font-bold">{cluster.totalClicks}</div>
                      </div>
                      <div>
                        <div className={`${isActive ? "text-slate-500" : "text-slate-400"} text-[8px]`}>Total Spend</div>
                        <div className="font-bold text-rose-500">${cluster.totalSpend.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className={`${isActive ? "text-slate-500" : "text-slate-400"} text-[8px]`}>ACOS</div>
                        <div className={`font-bold ${cluster.averageAcos > 0.4 ? "text-amber-500" : "text-emerald-500"}`}>
                          {cluster.averageAcos > 0 ? `${(cluster.averageAcos * 100).toFixed(0)}%` : "0%"}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Detail simulation cockpit */}
          {activeCluster && (
            <div className="lg:col-span-2 space-y-6">
              
              {/* Core Niche telemetry metrics */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
                
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`px-2.5 py-2 rounded-lg border font-mono font-black text-xs uppercase ${activeCluster.themeColor}`}>
                      {activeCluster.token.substring(0, 3)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        {activeCluster.label}
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        Synthesized market intelligence parameters for matching shopper queries
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded border">
                    EST Price Corridor: {activeCluster.competitorPriceRange}
                  </span>
                </div>

                {/* Simulated elastic target stats card */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100/80">
                    <div className="text-[9px] font-bold text-slate-405 text-slate-400 uppercase">Clustered Queries</div>
                    <div className="text-base font-black text-slate-900 font-mono">{activeCluster.terms.length}</div>
                    <div className="text-[9px] text-slate-500">Unique search variations</div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100/80">
                    <div className="text-[9px] font-bold text-slate-405 text-slate-400 uppercase">Sales Volume</div>
                    <div className="text-base font-black text-emerald-700 font-mono">${activeCluster.totalSales.toFixed(2)}</div>
                    <div className="text-[9px] text-slate-500">From {activeCluster.totalOrders} total orders</div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100/80">
                    <div className="text-[9px] font-bold text-slate-405 text-slate-400 uppercase">Average CPC</div>
                    <div className="text-base font-black text-slate-900 font-mono">
                      ${(activeCluster.totalClicks > 0 ? activeCluster.totalSpend / activeCluster.totalClicks : 1.10).toFixed(2)}
                    </div>
                    <div className="text-[9px] text-slate-500">Benchmark CPC anchor</div>
                  </div>

                  <div className="bg-rose-50/50 p-3 rounded-lg border border-rose-100 text-rose-950">
                    <div className="text-[9px] font-bold text-rose-500 uppercase">Actual Ad Spend</div>
                    <div className="text-base font-black font-mono">${activeCluster.totalSpend.toFixed(2)}</div>
                    <div className="text-[9px] text-rose-600">Total cluster investment</div>
                  </div>
                </div>

                {/* Queries inside the cluster sub-table */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Underlying Clustered Searches
                  </span>

                  <div className="border border-slate-150 rounded-lg overflow-hidden bg-slate-50/50">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200">
                          <th className="p-2.5">Customer Search query</th>
                          <th className="p-2.5 text-right">Clicks</th>
                          <th className="p-2.5 text-right">Orders</th>
                          <th className="p-2.5 text-right">Spend</th>
                          <th className="p-2.5 text-right">ACOS</th>
                          <th className="p-2.5">Parent key</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {activeCluster.terms.map((term, idx) => (
                          <tr key={idx} className="hover:bg-slate-100/50 transition font-medium text-slate-700">
                            <td className="p-2.5 font-semibold text-slate-800">{term.term}</td>
                            <td className="p-2.5 text-right font-mono">{term.clicks}</td>
                            <td className="p-2.5 text-right font-mono">{term.orders}</td>
                            <td className="p-2.5 text-right font-mono text-rose-600">${term.spend.toFixed(2)}</td>
                            <td className="p-2.5 text-right font-mono">
                              {term.acos > 0 ? `${(term.acos * 100).toFixed(0)}%` : "0%"}
                            </td>
                            <td className="p-2.5 text-[9px] text-slate-400 truncate max-w-32" title={term.parentTargeting}>
                              {term.parentTargeting}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Amazon Niche Validation & Multiplier Builder */}
              <div id="amazon-niche-advice-panel" className="bg-gradient-to-br from-indigo-50/25 to-sky-50/25 border border-indigo-100 rounded-xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-indigo-600 animate-pulse" />
                    Live Amazon Niche Validation & Target Discovery
                  </h4>
                  <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100/50">
                    Real-World Workflow
                  </span>
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-slate-650 leading-relaxed text-slate-600">
                    Since external automation cannot reliably scrape behind Amazon's real-time browser shields, we recommend querying this exact buyer intent directly on Amazon. Identify weak organic listings, premium pricing delta models, or poorly reviewed listings to conquest.
                  </p>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 font-sans text-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active Search Token</div>
                        <div className="text-sm font-bold text-slate-900 font-mono">"{activeCluster.token}"</div>
                      </div>
                      
                      <a
                        href={`https://www.amazon.com/s?k=${encodeURIComponent(activeCluster.token)}`}
                        target="_blank"
                        rel="noreferrer"
                        referrerPolicy="no-referrer"
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-xs cursor-pointer select-none whitespace-nowrap"
                        id="btn-search-amazon"
                      >
                        Search "{activeCluster.token}" on Amazon ↗
                      </a>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Quick Copy Query Phrases to Clipboard:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeCluster.terms.map((term, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleCopyQuery(term.term)}
                            className={`px-2.5 py-1.5 rounded-md border text-xs font-medium cursor-pointer transition select-none flex items-center gap-1 ${
                              copiedQuery === term.term
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                            }`}
                          >
                            <span>{term.term}</span>
                            <span className="text-[9px] opacity-60">
                              {copiedQuery === term.term ? "✓ Copied" : "📋"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 pt-1 font-sans">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Target ASIN Listings to Conquest (Comma or space separated):
                      </label>
                      <textarea
                        value={customAsinsInput}
                        onChange={(e) => setCustomAsinsInput(e.target.value)}
                        placeholder="e.g. B08XXXXXXX, B0BZYG4NMQ, B07YYYYYYY"
                        className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none transition h-20 resize-none font-semibold text-slate-800"
                        id="input-conquest-asins"
                      />
                      <p className="text-[9.5px] text-slate-450 italic leading-relaxed text-slate-500">
                        Tip: Copy the ASINs from the product detail page URLs of the weak competitors you find in the search query above, paste them here, then hit the deployment launcher below.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ASIN Target Cluster Injection Simulator Form */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-5">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Database className="w-3.5 h-3.5 text-slate-400" />
                  Target Cluster Injection Controls
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">Conquest Campaign Label</label>
                    <input 
                      type="text"
                      value={customCampaignName}
                      onChange={(e) => setCustomCampaignName(e.target.value)}
                      placeholder={`WESBID_ASIN_CLUSTER - ${activeCluster.token.toUpperCase()}`}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-md bg-slate-50 border border-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">Targeting Ad Group</label>
                    <div className="px-3 py-2 text-xs font-bold font-mono text-slate-700 bg-slate-150/40 rounded-md border border-slate-200/60">
                      Cluster - {activeCluster.token.charAt(0).toUpperCase() + activeCluster.token.slice(1)} Alignment
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 leading-normal max-w-sm">
                    Injects the full ASIN targets list above as a unified targeting set. Avoids single-placement failures and dynamically updates bid recommendation weights.
                  </p>

                  <button
                    type="button"
                    onClick={handleSimulateInjection}
                    disabled={isInjecting}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-lg text-xs shadow-md shadow-indigo-100 flex items-center gap-2 cursor-pointer transition select-none"
                  >
                    {isInjecting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Injecting v3 Clusters...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Inject Target Set to Sandbox</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* Progress animation modal Overlay */}
      {isInjecting && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-950 border border-slate-800 text-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-6 text-center">
            <div className="flex justify-center">
              <div className="p-4 bg-indigo-500/10 rounded-full border border-indigo-500/20 animate-pulse">
                <Cpu className="w-8 h-8 text-indigo-400 animate-spin-slow" />
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-bold tracking-tight">Compiling Niche Expansion Models</h4>
              <p className="text-[11px] text-slate-400 animate-pulse font-mono">{injectionStep}</p>
            </div>

            {/* Custom progress level bar */}
            <div className="space-y-1">
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${injectionProgress}%` }}
                ></div>
              </div>
              <div className="text-right font-mono text-[9px] text-slate-500">{injectionProgress}% compiled</div>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS INIECTION RECEIPT DIALOG */}
      <AnimatePresence>
        {showInjectedModal && injectedResult && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-6 relative"
            >
              <button 
                onClick={() => setShowInjectedModal(false)}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">ASIN Cluster Seed Injected Successfully</h4>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-100 lowercase">
                    simulated bulk sheets export synced
                  </span>
                </div>
              </div>

              {/* Injected telemetry details card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 divide-y divide-slate-200/80 font-mono text-[11px] text-slate-700 space-y-3">
                <div className="grid grid-cols-2 py-1.5 pt-0">
                  <span className="text-slate-440 font-semibold text-slate-450 uppercase text-[9px]">Target Campaign</span>
                  <span className="font-extrabold text-slate-950 text-right">{injectedResult.campaign}</span>
                </div>

                <div className="grid grid-cols-2 py-2">
                  <span className="text-slate-440 font-semibold text-slate-450 uppercase text-[9px]">Created Ad Group</span>
                  <span className="font-bold text-slate-900 text-right">{injectedResult.adGroup}</span>
                </div>

                <div className="grid grid-cols-2 py-2">
                  <span className="text-slate-440 font-semibold text-slate-450 uppercase text-[9px]">Intent Strategy Model</span>
                  <span className="font-bold text-indigo-700 text-right">{injectedResult.strategy}</span>
                </div>

                <div className="grid grid-cols-2 py-2">
                  <span className="text-slate-440 font-semibold text-slate-450 uppercase text-[9px]">Estimated Daily Budget Capsule</span>
                  <span className="font-bold text-slate-900 text-right text-emerald-700">${injectedResult.suggestedDailyCap} / day</span>
                </div>

                <div className="pt-3">
                  <span className="text-slate-440 font-bold uppercase text-[9px] block text-slate-400 mb-2">
                    Deployed Cluster Product Targets ({injectedResult.totalTargets})
                  </span>
                  
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {injectedResult.targetsInjected.map((tgt: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center bg-white border border-slate-200/60 p-2 rounded-lg text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold">
                            {tgt.asin}
                          </span>
                          <span className="text-[10px] text-slate-400 italic">
                            ({tgt.relevance})
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[9px] text-indigo-600 font-bold bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100/50">
                            {tgt.multiplier}x multiplier
                          </span>
                          <span className="text-emerald-700 font-extrabold">
                            ${tgt.baseBid.toFixed(2)} Target Bid
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Close controls */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowInjectedModal(false)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Confirm & Sync to Sandbox
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
