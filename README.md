# WesBid Optimizer — Amazon PPC Bidding & Simulation Lab 🔬

WesBid Optimizer is a professional, high-precision full-stack Amazon Sponsored Products PPC portfolio optimizer. It helps sellers, brands, and agencies audit keyword campaigns, fine-tune bidding formulas, simulate cost/spend elasticity, and produce production-ready Amazon Bulk Import sheets alongside deep AI-synthesized optimization memos.

Designed around a **Clean Minimalism** design philosophy, it features a highly polished typography setup, fluid layout structure, high-contrast visual indicators, and responsive charts.

---

## 🎨 Design Philosophy: Clean Minimalism

The interface is built to prioritize mathematical data density and workflow flow:
- **Minimalist Palette**: Utilizes soft off-whites (`#f8fafc`), deep charcoal slate text (`#0f172a`), royal blue brand highlight accents (`#2563eb`), and clean, semantic action badges (Scale 🟢, Reduce 🔴, Hold 🟡).
- **Deskstop-First Precision**: Formatted around a balanced single-page cockpit with fluid grids, ensuring full responsiveness from wide monitors down to multi-column setups.
- **Intentional Spacing**: Generous negative margins, clear visual hierarchy, thin refined borders (`#e2e8f0`), and custom-styled range sliders that map variables responsively without visual clutter.

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

### 2. Live Baselines & Micro Overrides
- **Custom "Current Bid" Ingest**: Operators can manual-input custom baseline bids directly in the table to align the model with real-time live Seller Central Console configurations instantly.
- **Active Human Micro-steps**: Double-click or override any keyword directly to override the computer recommendations.
- **Bulk Action Drawer**: Multi-select row checklist targets to increase/decrease bids by specific percentages, or bulk-set hard scale/reduction forces.

### 3. Search Term Granularity & Negative Harvester
While legacy tools guess, WesBid parses underlying customer search queries inside targeting branches and processes them under three intent-confidence tiers:
- **🔍 Observing Phase** (1–2 clicks, 0 orders): Passive evaluation; blocks premature negative flagging.
- **⚠️ Weak Waste Signal** (3–5 clicks, 0 orders): Flags keyword as a weak signal, advising manual monitoring.
- **🚨 Hard Negative Candidate** (6+ clicks, 0 orders): Flags critical leakage. Recommends adding as Negative Exact in Seller Central to instantly cut bleeders.

### 4. Market Intelligence & Niche Explorer v1
Bypasses the fragile "Keyword-to-Single-ASIN" PPC trap. Supports the sophisticated Amazon-native targeting abstraction:
$$\text{Shopper Intent} \longrightarrow \text{Niche Grouping} \longrightarrow \text{ASIN Competitor Clusters} \longrightarrow \text{Targeting Set Injection}$$

- **Query Token Clustering Engine**: Scans underlying customer search queries to dynamically calculate word token recurrences, agruping similar behaviors into localized macro-niche folders.
- **Live Amazon Validation Integration**: Directly provides high-value search shortcuts so operators can trigger direct validation searches on Amazon with a single click, identifying top competitor vulnerabilities (poor ratings, premium pricing deltas, low-quality setups).
- **Target Cluster Sandbox Ingest**: Formulates structured campaigns featuring custom strategic multipliers (Conquest / Defense / Harvest models) based on manually verified competitor listing ASIN inputs.

### 5. Analytics Delta & Visualizers
- **Simulated Spend Elasticity**: Real-time estimates of incoming budget shifts, variance percentages, and average recommendations.
- **Area-Area Distribution Charts**: Built with standard fully responsive Recharts displaying current vs. recommended bid distribution to easily spot anomalies.

### 6. WesBid Co-pilot AI Memo
- Powered by a safe full-stack server proxying **Gemini API** requests securely.
- Diagnoses structural inefficiencies, audits top star-performers, and structures localized actionable checklists to coordinate manual imports.

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
- **Full-Stack Core**: Express Server proxying server-side LLM diagnostic generation.
