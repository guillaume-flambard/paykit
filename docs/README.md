<div align="center">

# PayKit

### Credits, usage metering & subscriptions for AI apps — without building billing.

Drop in a meter call, gate Pro features, sell credit packs. PayKit runs the ledger,
Stripe takes the money. No billing tables, no webhook plumbing, no customer portal to build.

`Next.js` · `React` · `Postgres` · `Stripe` · works with Lovable, Bolt, v0, Cursor & plain HTML

[Quickstart](#quickstart) · [Concepts](#core-concepts) · [React SDK](#react-sdk) · [Embed](#embed-no-code) · [REST API](#rest-api) · [Billing](#billing--stripe) · [Self-host](#self-hosting)

</div>

---

## Why PayKit

Charging for an AI app means metering every model call, selling credits, gating premium
features, and reconciling all of it with Stripe. That's a database, a webhook handler, a
customer portal, and a week you don't have.

PayKit gives you one function — `meter()` — plus a `<Paywall>` and a hosted billing API.
You call `meter()` before each AI call; PayKit deducts a credit, tells you if the user is
out, and handles the buy-more flow. Subscriptions and credit packs settle through Stripe
Checkout and land back in the ledger automatically.

> **PayKit does not run your AI model.** Throughout these docs `image_gen` is just an
> example event name — *your* label for one billable action. Name it whatever your app
> does: `chat_message`, `transcription`, `render`, `api_call`. PayKit only counts and bills.

---

## Core concepts

| Concept | What it is |
|---|---|
| **Account** | One of *your* users, identified by a `userId` you choose. Holds `plan`, `credits`, `entitlements`. Created on first touch with **5 free credits**. |
| **Credit** | A unit of usage. `meter()` deducts credits; packs and grants add them. Deduction is **atomic** — never goes negative. |
| **Plan** | `free` or `pro`. A plan maps to **entitlements** (`pro` → `["pro"]`). Drives `<Paywall>` and `hasAccess()`. |
| **Metering** | Counting one billable action. At 0 credits the call is **blocked** (`402`) instead of charging overage. |
| **Project** | Your tenant boundary. Each has a **publishable key** (`pk_live_…`, browser-safe) and a **secret key** (`sk_live_…`, server-only). |
| **Demo project** | `pk_live_demo` / `sk_live_demo` — an open public sandbox. Use it to try the API with zero setup; never ship it. |

### Keys & where they go

| Key | Prefix | Use it… | Never… |
|---|---|---|---|
| **Publishable** | `pk_live_` | in the browser, the embed script, `access`/`meter` reads | — |
| **Secret** | `sk_live_` | server-side only: granting credits, secure metering | put in client code or a public repo |

PayKit reads the key from (in order): the **`x-paykit-key`** header, a **`key`** field in the
JSON body, or a **`?key=`** query param. No key → the demo project. An *unknown* key → `401`.

---

## Quickstart

Pick the path that matches your stack. All three hit the same API.

### 1 · No-code (any website) — 30 seconds

```html
<div id="paykit"></div>
<script src="https://paykit-two.vercel.app/embed.js" data-key="pk_live_…"></script>

<!-- spend a credit on click -->
<button data-paykit-meter="image_gen">Generate</button>

<!-- show only to Pro users -->
<div data-paykit-plan="pro">Pro-only content</div>
```

Renders a live credits meter + a Buy button, and wires every `data-paykit-*` element. Works
on Webflow, Wix, WordPress, plain HTML — no build step. → [Embed reference](#embed-no-code)

### 2 · React

```bash
npm install @paykit/react   # (or copy lib/paykit-react.tsx while pre-npm)
```

```tsx
import { PayKitProvider, Paywall, usePayKit } from "@paykit/react"

export default function App({ user }) {
  return (
    <PayKitProvider userId={user.id}>
      <ImageStudio />
      <Paywall plan="pro" fallback={<UpgradeCard />}>
        <HDUpscale />          {/* gated — Pro only */}
      </Paywall>
    </PayKitProvider>
  )
}

function ImageStudio() {
  const { meter, account } = usePayKit()
  async function generate() {
    const { blocked } = await meter("image_gen")   // −1 credit
    if (blocked) return openBuyCredits()           // out of credits
    runYourModel()
  }
  return <button onClick={generate}>Generate ({account?.credits} left)</button>
}
```

→ [React SDK reference](#react-sdk)

### 3 · Any backend (REST)

Meter from your **server**, where it's safe — never trust the client for billing.

```bash
curl -X POST https://paykit-two.vercel.app/api/v1/meter \
  -H "x-paykit-key: sk_live_…" \
  -H "Content-Type: application/json" \
  -d '{ "userId": "user_123", "event": "image_gen" }'
# → { "ok": true, "remaining": 4 }
```

→ [REST API reference](#rest-api)

---

## React SDK

### `<PayKitProvider userId={…}>`

Wrap your app (or the authed part). Loads the account on mount and exposes the context.

| Prop | Type | |
|---|---|---|
| `userId` | `string` | **Required.** Your stable id for the current user. |

### `usePayKit()`

```ts
const {
  account,    // { userId, plan, credits, entitlements } | null
  loading,    // boolean — true until the first load resolves
  refresh,    // () => Promise<void>            — re-fetch the account
  meter,      // (event, cost=1) => Promise<{ ok, remaining, blocked? }>
  buyCredits, // (amount) => Promise<void>      — local grant (no Stripe; dev/demo)
  upgrade,    // (plan) => Promise<void>        — local plan change (no Stripe; dev/demo)
  checkout,   // (kind: "credits" | "pro") => Promise<void>  — real Stripe, redirects
  hasAccess,  // (plan) => boolean              — entitlement check, sync
} = usePayKit()
```

- **`meter(event, cost?)`** — deduct `cost` credits (default `1`) for one action. Returns
  `{ ok, remaining }`, or `{ ok: false, blocked: true, remaining }` when there aren't enough.
  Always re-reads the account after.
- **`checkout("credits" | "pro")`** — opens Stripe Checkout and redirects. `"credits"` = a
  100-credit pack ($9), `"pro"` = the $19/mo subscription. Throws if Stripe isn't configured.
- **`buyCredits` / `upgrade`** — local stand-ins that change the ledger directly with no
  payment. Great for dev, demos, and "simulate purchase" buttons; don't use them in prod.

### `<Paywall plan fallback>`

```tsx
<Paywall plan="pro" fallback={<UpgradeCard />}>
  <PremiumFeature />
</Paywall>
```

Renders `children` when the user has the entitlement, otherwise `fallback` (default `null`).
Purely client-side gating for UX — **always enforce access on your server too**.

---

## Embed (no-code)

One script tag. Configure it with attributes:

| Attribute | Default | Purpose |
|---|---|---|
| `data-key` | — | Your **publishable** key (`pk_live_…`). Identifies the project. |
| `data-user` | a per-browser id | Your logged-in user's id. Omit and PayKit generates+stores one in `localStorage`. |
| `data-accent` | `#34d399` | Brand colour for the meter widget. |
| `data-base` | the script's origin | API origin, if you self-host the API elsewhere. |

### Declarative attributes — put these on any element

```html
<button data-paykit-meter="image_gen">Generate</button>   <!-- spends 1 credit on click -->
<div    data-paykit-plan="pro">Pro-only content</div>      <!-- hidden unless the user is Pro -->
```

### Imperative API — `window.PayKit`

```js
PayKit.meter("image_gen")   // → Promise<{ ok, remaining, blocked? }>, repaints the meter
PayKit.buy()                // → start Stripe Checkout for a credit pack
PayKit.refresh()            // → re-fetch the account
PayKit.account()            // → the cached account object
PayKit.user                 // → the resolved user id
```

The widget mounts into `<div id="paykit"></div>` (or appends one to `<body>` if absent), and
shows a friendly error if the `data-key` is wrong.

---

## REST API

Base URL: `https://paykit-two.vercel.app/api/v1` (replace with your origin if self-hosting).
Auth: `x-paykit-key` header, a `key` body field, or `?key=`. See [Keys](#keys--where-they-go).

### `GET /access`

Read an account. Safe with the publishable key.

```bash
curl "https://paykit-two.vercel.app/api/v1/access?userId=user_123&key=pk_live_…"
```
```json
{ "userId": "user_123", "plan": "free", "credits": 4, "entitlements": [] }
```

| Param | In | Notes |
|---|---|---|
| `userId` | query | **Required.** `400` if missing. |
| `key` | query/header | Invalid → `401`. |

### `POST /meter`

Deduct credits for one billable action. Call it from your **server**.

```bash
curl -X POST …/meter -H "x-paykit-key: sk_live_…" -H "Content-Type: application/json" \
  -d '{ "userId": "user_123", "event": "image_gen", "cost": 1 }'
```
```json
{ "ok": true, "remaining": 3 }
```

| Field | Type | Notes |
|---|---|---|
| `userId` | string | **Required.** |
| `event` | string | **Required.** Your event name. |
| `cost` | number | Optional, default `1`. |

**Responses:** `200 { ok, remaining }` · out of credits → **`402 { ok:false, blocked:true, remaining }`** ·
missing fields → `400` · invalid key → `401` · project requires secret key → `403`.

### `POST /credits`

Grant credits and/or change plan — the server-side, authoritative way (a local stand-in for
the Stripe webhook). **Requires the secret key** for real projects (`403` otherwise); the
demo project stays open.

```bash
curl -X POST …/credits -H "x-paykit-key: sk_live_…" -H "Content-Type: application/json" \
  -d '{ "userId": "user_123", "amount": 100, "plan": "pro" }'
```
```json
{ "userId": "user_123", "plan": "pro", "credits": 103, "entitlements": ["pro"] }
```

| Field | Type | Notes |
|---|---|---|
| `userId` | string | **Required.** |
| `amount` | number | Optional — credits to add. |
| `plan` | string | Optional — `"free"` or `"pro"`. |

### `POST /checkout`

Create a Stripe Checkout Session. Prices are inline — no Stripe dashboard setup needed.

```bash
curl -X POST …/checkout -H "Content-Type: application/json" \
  -d '{ "userId": "user_123", "kind": "pro", "key": "pk_live_…" }'
```
```json
{ "url": "https://checkout.stripe.com/c/pay/cs_test_…" }
```

| Field | Type | Notes |
|---|---|---|
| `userId` | string | **Required.** |
| `kind` | `"credits"` \| `"pro"` | `credits` = 100-credit pack ($9) · `pro` = $19/mo subscription. |

Redirect the user to `url`. No `STRIPE_SECRET_KEY` → `501`.

### `POST /webhook`

Stripe's endpoint — **you don't call this**. Point a Stripe webhook at it and set
`STRIPE_WEBHOOK_SECRET`. It verifies the signature and fulfils:

- `checkout.session.completed` → grants `packCredits` and/or sets the `plan` from metadata.
- `customer.subscription.deleted` → reverts the account to `free`.

### `GET /analytics` · `GET /accounts`

Dashboard data, scoped by key (no key → demo project, invalid → `401`).

```bash
curl "…/analytics?key=pk_live_…"
```
`/analytics` → usage series, top events, recent activity, plus
`stats: { total, pro, mrr, creditsOutstanding }` (MRR = pro × $19).
`/accounts` → `{ accounts: [...], stats }`.

### `… /projects`

Manage tenants (Clerk-authenticated for create/list).

| Method | Does |
|---|---|
| `GET` | List the signed-in owner's projects (keys included). |
| `POST` | Create a project `{ name? }` → returns keys. |
| `PATCH` | `{ secureMetering, key: sk_… }` — require the secret key for `/meter`. |

---

## Billing & Stripe

```
User clicks Buy ──▶ POST /checkout ──▶ Stripe Checkout ──▶ payment
                                                              │
   ledger updated ◀── POST /webhook ◀── checkout.session.completed
   (credits granted / plan = pro)
```

- **Credit pack** — `kind: "credits"` → one-time $9 for 100 credits.
- **Pro subscription** — `kind: "pro"` → $19/mo. Cancelling fires
  `customer.subscription.deleted`, which drops the user back to `free`.
- The `userId` rides along in Stripe **metadata**, so the webhook credits the exact account.
- **Test mode:** use Stripe test keys and `stripe listen --forward-to localhost:3000/api/v1/webhook`.

---

## Metering: blocking vs overage

Deduction is atomic and **stops at zero** — a user can't go negative. When credits run out,
`meter()` returns `blocked: true` (REST: `402`) and your code decides what to do (show a
paywall, open Buy). This is the safe default: you never accidentally give away unpaid usage.

```ts
const { blocked } = await meter("image_gen")
if (blocked) return openBuyCredits()   // don't run the model
runYourModel()
```

**Secure metering** — by default `/meter` accepts the publishable key (convenient for
client/embed use). Flip `secureMetering` on a project (`PATCH /projects`) to require the
**secret key**, so only your server can spend credits. Recommended once you're past the demo.

---

## Self-hosting

PayKit runs with **zero config** (in-memory store + simulate buttons). Add env vars to go real:

```bash
cp .env.example .env.local
```

| Variable | Required for | Notes |
|---|---|---|
| `DATABASE_URL` | persistence | `postgres://…` (e.g. Neon). Tables auto-create & migrate on boot. Without it → in-memory (resets on restart). |
| `STRIPE_SECRET_KEY` | checkout + webhook | `sk_test_…` / `sk_live_…`. |
| `STRIPE_WEBHOOK_SECRET` | webhook | from `stripe listen` or your dashboard endpoint. |
| `NEXT_PUBLIC_BASE_URL` | absolute redirect URLs | your public origin. Falls back to the request origin. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` | multi-tenant auth | optional — without them, project ownership falls back to a shared `demo` owner. |

```bash
npm install
npm run dev      # http://localhost:3000
```

**Stack:** Next.js 15 (App Router) · React 19 · Postgres (atomic `deduct`) · Stripe 17 ·
Clerk (optional auth). Storage is a pluggable `Store` interface — swap Postgres for anything.

---

## Security checklist

- 🔑 **Secret key server-side only.** `pk_live_` is browser-safe; `sk_live_` never ships to the client.
- 🛡️ **Enforce access on the server.** `<Paywall>` / `hasAccess()` are UX gates, not security. Re-check entitlements before doing privileged work.
- 🔒 **Turn on secure metering** for production so only your backend can spend credits.
- 🧾 **Verify webhooks.** The endpoint checks the Stripe signature — keep `STRIPE_WEBHOOK_SECRET` set and secret.
- 🧪 **Don't ship the demo project.** `pk_live_demo` / `sk_live_demo` is a shared open sandbox.

---

## FAQ

**Does PayKit generate images / run my model?** No. It meters and bills. `image_gen` is just
an example event name — call your events whatever you like.

**What's a "credit" worth?** Whatever you decide. One `meter()` call deducts `cost` credits
(default 1); price your packs to match your model costs.

**Free credits?** New accounts start with **5**.

**Do I need Stripe to try it?** No — the in-memory store + `buyCredits`/`upgrade` stand-ins
let you build the whole flow before adding a single key.

**Per-call pricing instead of credits?** Set `cost` per event to model different prices
(e.g. `meter("hd_upscale", 4)`).

---

<div align="center">
<sub>PayKit · billing infrastructure for AI apps · <a href="https://paykit-two.vercel.app">live demo</a></sub>
</div>
