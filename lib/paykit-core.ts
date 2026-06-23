// PayKit core — the trusted, server-side billing engine.
// MVP storage = in-memory (resets on restart). Swap `store` for Postgres/Supabase next.

export interface Account {
  userId: string
  plan: string // "free" | "pro" | ...
  credits: number
  entitlements: string[]
}

export interface Store {
  get(userId: string): Account | undefined
  set(account: Account): void
}

class MemoryStore implements Store {
  private accounts = new Map<string, Account>()
  get(userId: string) {
    return this.accounts.get(userId)
  }
  set(account: Account) {
    this.accounts.set(account.userId, account)
  }
}

// Plans → entitlements. (Later: defined per project in a dashboard.)
const PLAN_ENTITLEMENTS: Record<string, string[]> = {
  free: [],
  pro: ["pro"],
}

const STARTING_FREE_CREDITS = 5

// Singleton across hot-reloads / route invocations in the dev process.
const globalForPayKit = globalThis as unknown as { __paykitStore?: Store }
export const store: Store = globalForPayKit.__paykitStore ?? (globalForPayKit.__paykitStore = new MemoryStore())

function ensure(userId: string): Account {
  let account = store.get(userId)
  if (!account) {
    account = { userId, plan: "free", credits: STARTING_FREE_CREDITS, entitlements: PLAN_ENTITLEMENTS.free }
    store.set(account)
  }
  return account
}

export function getAccount(userId: string): Account {
  return ensure(userId)
}

export interface MeterResult {
  ok: boolean
  remaining: number
  blocked?: boolean
}

/** Deduct credits for one AI usage event. Returns blocked=true if insufficient. */
export function meter(userId: string, _event: string, cost = 1): MeterResult {
  const account = ensure(userId)
  if (account.credits < cost) {
    return { ok: false, blocked: true, remaining: account.credits }
  }
  account.credits -= cost
  store.set(account)
  return { ok: true, remaining: account.credits }
}

/** Grant credits (called by a Stripe webhook on successful credit-pack purchase). */
export function grantCredits(userId: string, amount: number): Account {
  const account = ensure(userId)
  account.credits += amount
  store.set(account)
  return account
}

/** Set the subscription plan (called by a Stripe webhook on subscription change). */
export function setPlan(userId: string, plan: string): Account {
  const account = ensure(userId)
  account.plan = plan
  account.entitlements = PLAN_ENTITLEMENTS[plan] ?? []
  store.set(account)
  return account
}

export function hasAccess(userId: string, plan: string): boolean {
  if (plan === "free") return true
  return ensure(userId).entitlements.includes(plan)
}
