# PayKit — design prompt (for Claude / v0 / Lovable / Stitch)

Paste this into an AI design tool. For Claude, ask for a single self-contained React + Tailwind artifact.

---

You are a senior product designer. Design the UI for **PayKit** — a developer tool that adds **credits,
usage-based billing & subscriptions to AI apps** in minutes. Stripe-grade polish, developer-first, dark mode.

**Who uses it:** solo devs and small teams who built an AI app (on Lovable, Bolt, v0, Cursor, or Next.js) and need
to charge users — sell credit packs, meter usage per AI call, and gate Pro features — without building billing infra.

**Brand & vibe:** modern, technical, trustworthy, fast. Dark theme, near-black background (#0a0a0a), ONE electric
accent (emerald `#34d399` or indigo `#6366f1` — pick one and commit), crisp type (Inter or Geist), generous spacing,
hairline borders (`#262626`), monospace for code. Feels like Linear × Stripe × Vercel. No clutter, no salesy gradients,
no stock photos. Accessible contrast. Mobile-responsive.

**Design these screens:**
1. **Marketing landing** — hero ("Get paid for your AI app — in 10 minutes"), a 3-pain block, 3 feature cards
   (credits & usage billing / subscriptions & paywall / drop-in, no backend), a 3-line code snippet as a visual,
   pricing teaser ($19/mo), waitlist CTA, minimal footer. Conversion-focused, honest developer tone.
2. **Dashboard** (after login) — left sidebar (Overview, Plans, Usage, Customers, API keys, Settings).
   - Overview: stat cards (MRR, active subscriptions, credits sold this month, AI cost vs revenue), a usage line chart.
   - Plans editor: create plans & credit packs (name, price, included credits, entitlements).
   - API keys: publishable + secret keys with copy / reveal / rotate.
   - Customers: a table (user, plan, credits, status, joined).
3. **Quickstart / onboarding** — 3 steps ("install → add your key → meter your first call") with copyable code blocks
   and a success state.
4. **Embeddable widget** — the `<Paywall>` + credits component as it looks INSIDE a customer's app: compact,
   themeable, shows "X credits left", "Buy more", and an upgrade prompt for locked features.

**Deliverable:** first a small design system (color tokens, type scale, and core components — buttons, inputs, cards,
tables, code blocks, badges, nav, charts), then high-fidelity, responsive mockups of all four screens using that system.
Build it as a single self-contained React + Tailwind artifact (no external assets); use the code snippet itself as the
hero visual. Keep all copy crisp and developer-honest — no hype.
