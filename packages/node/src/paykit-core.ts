// PayKit core — selects a store and exposes the billing engine.
import { type Account, type Analytics, type MeterResult, type Project, type Store, DEFAULT_PROJECT_ID, PLAN_ENTITLEMENTS } from "./types.js"
import { MemoryStore } from "./store-memory.js"
import { PostgresStore } from "./store-postgres.js"

const globalForPayKit = globalThis as unknown as { __paykitStore?: Store }

function makeStore(): Store {
  const url = process.env.DATABASE_URL
  return url ? new PostgresStore(url) : new MemoryStore()
}

export const store: Store = globalForPayKit.__paykitStore ?? (globalForPayKit.__paykitStore = makeStore())

export async function getAccount(userId: string): Promise<Account> {
  return store.get(userId)
}

// Analytics is best-effort: a failed event write must never break billing.
function track(userId: string, kind: "meter" | "grant" | "plan", name: string, amount: number, costUsd?: number) {
  store.recordEvent({ userId, kind, name, amount, costUsd, at: new Date().toISOString() }).catch(() => {})
}

/** Deduct credits for one AI usage event. blocked=true if insufficient. */
export async function meter(userId: string, event: string, cost = 1, costUsd?: number): Promise<MeterResult> {
  // Free-ride guard: a non-positive cost would mint (negative) or give away
  // (zero) credits — the "never lose money on model costs" boundary.
  if (!Number.isInteger(cost) || cost < 1 || cost > 1_000_000) {
    throw new Error("cost must be a positive integer ≤ 1000000")
  }
  if (costUsd !== undefined && (typeof costUsd !== "number" || !Number.isFinite(costUsd) || costUsd < 0 || costUsd > 1_000_000)) {
    throw new Error("costUsd must be a non-negative number ≤ 1000000")
  }
  const r = await store.deduct(userId, cost)
  if (r.ok) track(userId, "meter", event, -cost, costUsd)
  return r.ok ? { ok: true, remaining: r.remaining } : { ok: false, blocked: true, remaining: r.remaining }
}

export async function grantCredits(userId: string, amount: number): Promise<Account> {
  // Grant guard: a negative/zero amount would steal credits; oversized mints them.
  if (!Number.isInteger(amount) || amount < 1 || amount > 1_000_000) {
    throw new Error("amount must be a positive integer ≤ 1000000")
  }
  const a = await store.addCredits(userId, amount)
  track(userId, "grant", "credits", amount)
  return a
}

export async function setPlan(userId: string, plan: string): Promise<Account> {
  if (!(plan in PLAN_ENTITLEMENTS)) {
    throw new Error(`unknown plan: ${plan}`)
  }
  const a = await store.setPlan(userId, plan, PLAN_ENTITLEMENTS[plan] ?? [])
  track(userId, "plan", plan, 0)
  return a
}

export async function setStripeCustomer(userId: string, customerId: string): Promise<Account> {
  return store.setStripeCustomer(userId, customerId)
}

export async function analytics(projectId = DEFAULT_PROJECT_ID): Promise<Analytics> {
  return store.analytics(projectId)
}

export async function listAccounts(projectId = DEFAULT_PROJECT_ID): Promise<Account[]> {
  return store.list(projectId)
}

export async function createProject(name: string, ownerId: string): Promise<Project> {
  return store.createProject(name, ownerId)
}

export async function listProjectsByOwner(ownerId: string): Promise<Project[]> {
  return store.listProjectsByOwner(ownerId)
}

export async function getProject(id: string): Promise<Project | null> {
  return store.getProject(id)
}

/** Toggle secure metering for the project owning `secretKey`. Returns it, or null if the key is invalid. */
export async function setProjectSecureMetering(secretKey: string, value: boolean): Promise<Project | null> {
  const p = await store.getProjectByKey(secretKey)
  if (!p) return null
  await store.setSecureMetering(p.id, value)
  return { ...p, secureMetering: value }
}

/**
 * Resolve a project id from an API key.
 * - no key  → the public demo project (keeps the no-key embed/showcase working)
 * - valid   → that project's id
 * - unknown → null (caller should reject with 401 — don't silently leak into demo)
 */
export async function projectFromKey(key: string | null | undefined): Promise<string | null> {
  if (!key) return DEFAULT_PROJECT_ID
  const p = await store.getProjectByKey(key)
  return p ? p.id : null
}

export async function hasAccess(userId: string, plan: string): Promise<boolean> {
  if (plan === "free") return true
  const a = await store.get(userId)
  return a.entitlements.includes(plan)
}
