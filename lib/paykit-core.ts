// PayKit core — selects a store and exposes the billing engine.
import { type Account, type MeterResult, type Store, PLAN_ENTITLEMENTS } from "./types"
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

/** Deduct credits for one AI usage event. blocked=true if insufficient. */
export async function meter(userId: string, _event: string, cost = 1): Promise<MeterResult> {
  const r = await store.deduct(userId, cost)
  return r.ok ? { ok: true, remaining: r.remaining } : { ok: false, blocked: true, remaining: r.remaining }
}

export async function grantCredits(userId: string, amount: number): Promise<Account> {
  return store.addCredits(userId, amount)
}

export async function setPlan(userId: string, plan: string): Promise<Account> {
  return store.setPlan(userId, plan, PLAN_ENTITLEMENTS[plan] ?? [])
}

export async function hasAccess(userId: string, plan: string): Promise<boolean> {
  if (plan === "free") return true
  const a = await store.get(userId)
  return a.entitlements.includes(plan)
}
