# paykit-node

PayKit billing engine for Node — **credits, usage metering & subscriptions for AI apps**.

Drop it into your AI backend to meter usage, sell credit packs, and never lose money on model costs.

## Install
```bash
npm install paykit-node
```

## Quick start (in-memory store — zero config)
```ts
import { meter, grantCredits, getAccount, hasAccess } from "paykit-node"

const userId = "user_123"

await grantCredits(userId, 100)                 // credit pack, top-up
await meter(userId, "image_gen", 3)             // deduct 3 credits — ok/blocked if empty
const account = await getAccount(userId)        // { plan, credits, entitlements }
const ok = await hasAccess(userId, "pro")       // plan gating
```

## Postgres (persistent)
```bash
DATABASE_URL=postgres://... npm start
```
Set `DATABASE_URL` and the store switches to Postgres with atomic deducts.

## Guardrails
- `meter` rejects non-positive/oversized costs (`1 ≤ cost ≤ 1_000_000`) — a negative cost would mint credits.
- `grantCredits` only grants positive amounts.

## API
- `meter(userId, event, cost?)` → `{ ok, blocked, remaining }`
- `grantCredits(userId, amount)` · `setPlan(userId, plan)` (`free` | `pro`)
- `getAccount(userId)` · `hasAccess(userId, plan)` · `analytics(projectId?)` · `createProject(name, ownerId)`

Docs: https://github.com/guillaume-flambard/paykit
