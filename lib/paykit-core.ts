// PayKit core — selects a store and exposes the billing engine.
import { type Account, type Analytics, type MeterResult, type Project, type Store, DEFAULT_PROJECT_ID, PLAN_ENTITLEMENTS } from "./types"
import { MemoryStore } from "./store-memory"
import { PostgresStore } from "./store-postgres"

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
function track(userId: string, kind: "meter" | "grant" | "plan", name: string, amount: number) {
  store.recordEvent({ userId, kind, name, amount, at: new Date().toISOString() }).catch(() => {})
}

/** Deduct credits for one AI usage event. blocked=true if insufficient. */
export async function meter(userId: string, event: string, cost = 1): Promise<MeterResult> {
  const r = await store.deduct(userId, cost)
  if (r.ok) track(userId, "meter", event, -cost)
  return r.ok ? { ok: true, remaining: r.remaining } : { ok: false, blocked: true, remaining: r.remaining }
}

export async function grantCredits(userId: string, amount: number): Promise<Account> {
  const a = await store.addCredits(userId, amount)
  track(userId, "grant", "credits", amount)
  return a
}

export async function setPlan(userId: string, plan: string): Promise<Account> {
  const a = await store.setPlan(userId, plan, PLAN_ENTITLEMENTS[plan] ?? [])
  track(userId, "plan", plan, 0)
  return a
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

/** Resolve a project id from an API key; falls back to the default project. */
export async function projectFromKey(key: string | null | undefined): Promise<string> {
  if (!key) return DEFAULT_PROJECT_ID
  const p = await store.getProjectByKey(key)
  return p ? p.id : DEFAULT_PROJECT_ID
}

export async function hasAccess(userId: string, plan: string): Promise<boolean> {
  if (plan === "free") return true
  const a = await store.get(userId)
  return a.entitlements.includes(plan)
}
