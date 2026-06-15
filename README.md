# WesBid Optimizer — Amazon PPC Bidding & Simulation Lab 🔬

WesBid Optimizer is a professional, high-precision full-stack Amazon Sponsored Products PPC portfolio optimizer. It helps sellers, brands, and agencies audit keyword campaigns, fine-tune bidding formulas, simulate cost/spend elasticity, and produce production-ready Amazon Bulk Import sheets alongside deep AI-synthesized optimization memos.

Designed around a **Clean Minimalism** design philosophy, it features a highly polished typography setup, fluid layout structure, high-contrast visual indicators, and responsive charts.

---

## 🎨 Design Philosophy: Clean Minimalism

The interface is built to prioritize mathematical data density and workflow flow:
- **Minimalist Palette**: Utilizes soft off-whites (`#f8fafc`), deep charcoal slate text (`#0f172a`), royal blue brand highlight accents (`#2563eb`), and clean, semantic action badges (Scale 🟢, Reduce 🔴, Hold 🟡).
- **Desktop-First Precision & Layout**: Formatted around a balanced single-page cockpit with fluid grids, ensuring full responsiveness from wide monitors down to multi-column setups.
- **Amazon Ads Console Freeze/Sticky Columns**: Checkboxes (`sticky left-0`) and Targeting/Campaign parameters (`sticky left-[48px]`) are locked/pinned with custom drop-shadow borders, enabling seamless horizontal sliding across performance metrics just like the seller console.
- **Smooth Viewport Vertical Scrolling**: Encased in a `max-h-[620px]` container with custom sleek scrollbars (`scrollbar-thin`) to allow fast, eye-friendly vertical scrolling of high-count keyword datasets without losing sight of headers or locked targeting properties.

---

## 🚀 Key Functional Modules

### 1. Formula Bidding Cockpit & WesBid v3 Adaptive Engine
Our bidding engine dynamically calculates target recommendations utilizing mathematical formulas combined with state-driven confidence modeling and target intent layers:
$$\text{Recommended Target Bid} = \text{Baseline CPC} \times \frac{\text{Target ACOS}}{\text{Actual ACOS}} \times \text{Adaptive Modifier}$$

- **Target ACOS Slider (5% – 90%)**: Set your efficiency threshold parameter.
- **Dampening Shift Slide (10% – 100%)**: Smooths recommended bid swings. Lower dampening protects you against extreme CPC volatility.
- **WesBid v3 Adaptive Engine Control (Toggle-enabled)**:
  - **Confidence Scaling Coefficient (10% – 100%)**: Dynamically restricts bid adjustment speed based on conversion stability state records. Solves single-order instability (reduces scaling speed by 50% for 1 order, and 20% for <=3 orders) to avoid bidding hikes on statistically thin data.
  - **ACOS Performance Decay Gravity**: Applies safety drag to bid increases on keywords exhibiting high-ACOS decay.
  - **TOS Conversion Stability Safety Gate**: Strict protection gate. The 15% Top-of-Search placement boost is only unlocked once a high-margin target clears a safety benchmark of **at least 5 clicks** and **1 real order**, guarding against phantom ROAS scaling.
- **Intent-Layered Targeting**:
  - **Exact Match Priority**: High-confidence targets receive elevated efficiency thresholds, lowered learning boundaries, and optimized safety limits to scale dominance.
  - **Broad/Auto Protection**: Controls automated search leakage by tightening click thresholds and accelerating waste penalties.
  - **ASIN (PAT) Placements**: Custom parameter bounds adjusted dynamically for product detail pages.
- **💾 JSON Configuration Backup & Restore**: Operators can backup customized Strategy Presets, learning click thresholds, math dampeners, match overrides, and dynamic active confidence sliders as standalone `.json` config profile files. Restore setups instantly to clone parameters between workspaces or sync desktop environments.

### 2. ⭐ Top Performers Quick-Filter & Bid Boost
An advanced, automated targeting filter designed to isolate and supercharge high-velocity keywords:
- **Automatic ROAS Extraction**: Scans the active dataset and instantaneously isolates the **top 10% of keyword targets based on ROAS** (Return on Ad Spend).
- **High-Impact Bid Scaling**: Bypasses baseline thresholds and automatically applies a tailored **+20% bid modifier** to aggressively lock down premium Top-Of-Search impressions, driving maximum market share.
- **Micro-Badges**: Highlighted with custom Sparkle indicators in the active table view for fast identification.

### 3. 🎯 Core Conversion Columns: Orders & CVR Trackers
Renders rich conversion statistics in the main table to streamline real-time performance diagnostics:
- **Direct Orders Metric**: Added immediately next to Clicks, showing true conversion scale in dense bold styling.
- **Calculated CVR (Conversion Rate)**: Maps the dynamic efficiency ratio of purchases to clicks (`(Orders / Clicks) * 100`) directly beside Orders. Formatted in a soft emerald highlight, allowing operators to immediately flag stellar low-cpc converters.

### 4. 🎛️ Advanced Metric Slicers & Filters
Allows portfolio managers to execute deep surgical analyses with multiple concurrent filter groups:
- **Target Match Type Selectors**: Instantly narrow focus down to `Exact`, `Phrase`, `Broad`, or `Expression / Auto` match types.
- **Dual-Range Continuous Sliders**:
  - **Min Spend Slider**: Exclude low-spend test keywords to clean up high-value targets.
  - **Min Clicks Slider**: Filter out keyword noise with low click-traffic significance.
- **Performance Threshold Flags**:
  - **Bleeder Clicks with 0 Sales**: Fast-audit target leakage (clicks > 0 and 0 orders) to implement immediate safety holds.
  - **Star Converters (CVR ≥ 15%)**: Instantly crop elite-ranking keywords with high conversion vectors.

### 5. 📋 Live Tab-Delimited Clipboard Mirroring
Bypass clunky file downloads with instant spreadsheet interoperability:
- **One-Click Quick Copy**: Copies all currently filtered and sorted keyword rows into the system clipboard.
- **Exact Tab-Delimited Format**: Prefixes headers and columns precisely to support immediate, zero-formatting **Paste (`Ctrl+V`) directly into Microsoft Excel, Google Sheets, or Seller Central** bulk sheet templates.

### 6. Live Baselines & Micro Overrides
- **Custom "Current Bid" Ingest**: Operators can manual-input custom baseline bids directly in the table to align the model with real-time live Seller Central Console configurations instantly.
- **Active Human Micro-steps**: Double-click or override any keyword directly to override the computer recommendations.
- **Bulk Action Drawer**: Multi-select row checklist targets to increase/decrease bids by specific percentages, or bulk-set hard scale/reduction forces.

### 7. Search Term Granularity & Negative Harvester
While legacy tools guess, WesBid parses underlying customer search queries inside targeting branches and processes them under three intent-confidence tiers. To prevent the *"1-click, 100% conversion"* error, it utilizes **Wesley's PPC Sample Size & Significance Calibration Bar** to label keyword maturity in the search terms subdrawer:
- **🎲 Luck Zone (1–2 Clicks with ≥1 Order)**: Purely statistical lucky variance. Warns operators not to count a high conversion rate on thin sample structures as definitive. Otherwise classified as *Observing*.
- **👀 Watch List (3–5 Clicks)**: Early watch signal. Recommends passive observation before applying aggressive scaling.
- **📈 Emerging Signal (6–10 Clicks)**: Real data trends forming. Highlights mathematical significance building up.
- **✅ Actionable Data (10+ Clicks)**: Excellent, statistically significant sample size ready for immediate strategic bidding overrides.

### 8. Market Intelligence & Niche Explorer v1
Bypasses the fragile "Keyword-to-Single-ASIN" PPC trap. Supports the sophisticated Amazon-native targeting abstraction:
$$\text{Shopper Intent} \longrightarrow \text{Niche Grouping} \longrightarrow \text{ASIN Competitor Clusters} \longrightarrow \text{Targeting Set Injection}$$

- **Query Token Clustering Engine**: Scans underlying customer search queries to dynamically calculate word token recurrences, grouping similar behaviors into localized macro-niche folders.
- **Live Amazon Validation Integration**: Directly provides high-value search shortcuts so operators can trigger direct validation searches on Amazon with a single click, identifying top competitor vulnerabilities (poor ratings, premium pricing deltas, low-quality setups).
- **Target Cluster Sandbox Ingest**: Formulates structured campaigns featuring custom strategic multipliers (Conquest / Defense / Harvest models) based on manually verified competitor listing ASIN inputs.

### 9. Analytics Delta & Visualizers
- **Simulated Spend Elasticity**: Real-time estimates of incoming budget shifts, variance percentages, and average recommendations.
- **Area-Area Distribution Charts**: Built with standard fully responsive Recharts displaying current vs. recommended bid distribution to easily spot anomalies.

### 10. WesBid Co-pilot AI Memo
- Powered by a safe full-stack server proxying **Gemini API** requests securely.
- **Parse-Resilient Safe Extraction**: Augmented with robust regex-slicing error handlers that rescue valid JSON objects out of dirty response outputs, preventing unexpected crashes due to network gateway warnings or prefixing.
- Diagnoses structural inefficiencies, audits top star-performers, and structures localized actionable checklists to coordinate manual imports.

### 11. ⚡ Quick ACOS Calculator & Direct Console Parser
Provides seamless standalone workspace integrations to avoid bulky or continuous data import operations:
- **Direct Clipboard Pasting**: Operators can copy the dynamic summary metric tiles or horizontal lists directly from the Amazon Seller Central Ad Console and drop them raw into the parser.
- **Intelligent Signature Recognition**: Automatically scans and strips formatting, resolving **Date range**, **Clicks**, **CPC**, **Purchases/Orders**, **Sales**, and **Impressions** sequentially from unstructured blocks.
- **WesBid Bidding Synthesis**: Dynamically calculates estimated spend, CTR, CVR, ACOS, and executes safety threshold algorithms to output a pristine **New Suggested Bid** with step-by-step mathematical proofs (supporting active, click-driven average-CPC fallbacks even if zero sales are recorded from day 1).
- **📝 Export Row Data for Tracking Sheets**: A dedicated **Copy Data** button formats parsed performance metrics as a tab-delimited, single-row string (including Date range, Impressions, Clicks, Spend, Sales, ACOS, and Bids) ready to copy-paste directly into weekly, monthly, or daily tracking sheets.
- **Adaptive Sandbox Sync**: Features a "Save to Sandbox Scratchpad" connector, enabling operators to immediately send parsed results into the scratchpad evaluation table for concurrent batch calculations alongside synthetic keyword parameters.

---

## 💾 Supported Data Formats

WesBid accepts any copy-pasted or uploaded tab-delimited text/CSV export directly from **Amazon Campaign Manager > Sponsored Products Search Term Reports**.

Required columns mapped automatically:
- `Campaign` or `Campaign Name`
- `Ad Group` or `Ad Group Name`
- `Customer Search Term` or `Targeting`
- `Clicks`
- `Spend`
- `Sales` or `7 Day Total Sales`
- `Orders` or `7 Day Total Orders`
- `CPC` or `Average CPC`
- `Current Bid` or `Bid`

---

## 🛠️ Technological Stack

- **Client SPA**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **Styling Utility**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts Engine**: [Recharts](https://recharts.org/)
- **Full-Stack Core**: Express Server with pre-compiled transpiled modules handling LLM diagnostic requests securely.
