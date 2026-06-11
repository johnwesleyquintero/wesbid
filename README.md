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

### 1. Formula Bidding Cockpit
Our multi-variable bidding engine dynamically calculates target recommendations utilizing mathematical formulas rather than rigid static thresholds:
$$\text{Recommended Target Bid} = \frac{\text{Orders}}{\text{Clicks}} \times \text{Average Order Value} \times \text{Target ACOS}$$
- **Target ACOS Slider (5% – 90%)**: Set your efficiency threshold parameter.
- **Dampening Shift Slide (10% – 100%)**: Smooths recommended bid swings. Lower dampening protects you against extreme cpc volatility.
- **Learning Phase Protection**: Keywords with clicks below your click threshold holding zero sales are gracefully protected to gather sufficient statistical significance.
- **Bleeder Penalties**: Detects and flags low-converting click dumps ("bleeders") to apply immediate customizable penalty reductions (e.g. -40% bid shifts).
- **Bidding Caps & Floors**: Absolute safeguard ceilings and floors to secure campaigns from rogue budget drains.

### 2. Sandbox Overrides (Individual & Bulk)
- **Active Human Micro-steps**: Double-click or override any keyword directly to bypass the computer mathematical recommendations.
- **Bulk Action Drawer**: Multi-select row checklist targets to increase/decrease bids by specific percentages, or bulk-set hard scale/reduction forces.

### 3. Analytics Delta & Visualizers
- **Simulated Spend Elasticity**: Real-time estimates of incoming budget shifts, variance percentages, and average recommendations.
- **Area-Area Distribution Charts**: Built with standard fully responsive Recharts displaying current vs. recommended bid distribution to easily spot anomalies.

### 4. WesBid Co-pilot AI Memo
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
