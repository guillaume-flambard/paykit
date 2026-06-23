# PayKit

Drop-in **credits, usage metering & subscriptions for AI apps**. See `~/Vault/01-Projects/PayKit.md`.

## What's here (MVP v0 — runnable)
- **Core engine** (`lib/paykit-core.ts`): credits, `meter()`, plans/entitlements, `hasAccess()`. In-memory store (swap for Postgres).
- **API** (`app/api/v1/*`): `POST /meter`, `GET /access`, `POST /credits` (Stripe-webhook stand-in).
- **React SDK** (`lib/paykit-react.tsx`): `PayKitProvider`, `usePayKit()`, `<Paywall>`.
- **Live demo** (`app/page.tsx`): a mock AI app that meters credits and paywalls a Pro feature.

## Run
```bash
npm install
npm run dev      # demo at http://localhost:3000 (or next free port)
```

## Integration (how a customer uses it)
```tsx
// client
<PayKitProvider userId={user.id}>
  <Paywall plan="pro"><HdUpscale /></Paywall>
</PayKitProvider>

const { meter } = usePayKit()
// server (trusted): before/after an AI call
await fetch("/api/v1/meter", { method: "POST", body: JSON.stringify({ userId, event: "image_gen" }) })
```

## Roadmap (next)
1. **Persistence:** replace in-memory store with Postgres/Supabase.
2. **Stripe:** Checkout for subscriptions + credit packs; webhook → `grantCredits` / `setPlan`.
3. **Projects & API keys:** multi-tenant (publishable + secret key per project) + a dashboard to define plans.
4. **Packaging:** publish `@paykit/react` + `@paykit/node` to npm.
