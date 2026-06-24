# PayKit

Drop-in **credits, usage metering & subscriptions for AI apps**. See `~/Vault/01-Projects/PayKit.md`.

> 📖 **[Full documentation → `docs/README.md`](docs/README.md)** — concepts, React SDK, embed, REST API, billing & self-hosting.

## What's here (MVP v0.1 — runnable)
- **Core engine** (`lib/paykit-core.ts` + `lib/types.ts`): credits, `meter()`, plans/entitlements, `hasAccess()`.
- **Pluggable store:** in-memory (`store-memory.ts`) by default; **Postgres** (`store-postgres.ts`, atomic deduct) when `DATABASE_URL` is set.
- **API** (`app/api/v1/*`): `POST /meter`, `GET /access`, `POST /credits` (sim), `POST /checkout` (Stripe), `POST /webhook` (Stripe).
- **React SDK** (`lib/paykit-react.tsx`): `PayKitProvider`, `usePayKit()`, `<Paywall>`.
- **Live demo** (`app/page.tsx`): meters credits, paywalls a Pro feature, simulate + real Stripe checkout.

## Run
```bash
npm install
npm run dev      # demo at http://localhost:3000 (or next free port)
```
Works with zero config (in-memory + simulate buttons). Add env to go real:

```bash
cp .env.example .env.local
# DATABASE_URL=postgres://...           # persistence
# STRIPE_SECRET_KEY=sk_test_...         # checkout + webhook
# STRIPE_WEBHOOK_SECRET=whsec_...        # `stripe listen --forward-to localhost:3000/api/v1/webhook`
```

## Integration — two ways

**No code (any website).** Paste one line — works on Webflow, Wix, WordPress, plain HTML. Renders the credits meter + "Buy credits" button. See `public/embed.js` / live example at `/embed-demo.html`.
```html
<div id="paykit"></div>
<script src="https://<your-paykit>/embed.js" data-key="pk_live_..."></script>

<!-- charge a credit on click -->
<button data-paykit-meter="image_gen">Generate</button>
<!-- hide until the user is Pro -->
<div data-paykit-plan="pro">Pro-only content</div>
```

**Developers (React).**
```tsx
<PayKitProvider userId={user.id}>
  <Paywall plan="pro"><HdUpscale /></Paywall>
</PayKitProvider>

// server (trusted), before/after an AI call:
await fetch("/api/v1/meter", { method: "POST", body: JSON.stringify({ userId, event: "image_gen" }) })
```

## Roadmap (next)
1. **Multi-tenant:** projects + API keys (publishable + secret) + a dashboard to define plans/prices.
2. **Publish** `@paykit/react` + `@paykit/node` to npm.
3. Usage analytics + cost-vs-revenue guardrails.
