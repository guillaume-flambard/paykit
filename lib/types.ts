// Shared types & config for PayKit (no runtime deps → safe to import anywhere).

export interface Account {
  userId: string
  plan: string
  credits: number
  entitlements: string[]
}

export interface MeterResult {
  ok: boolean
  remaining: number
  blocked?: boolean
}

/** A timestamped billing event — the raw material for usage analytics. */
export interface UsageEvent {
  userId: string
  kind: "meter" | "grant" | "plan" // metered call · credits granted · plan change
  name: string // event name (meter), "credits" (grant), or plan id (plan)
  amount: number // credits delta (negative for meter, positive for grant)
  at: string // ISO timestamp
}

export interface Analytics {
  meteredThisMonth: number
  creditsSoldThisMonth: number
  topEvents: { name: string; count: number }[]
  series: { label: string; metered: number; granted: number }[] // daily, last 14 days
  recent: UsageEvent[]
}

export interface Store {
  /** Get (creating with defaults if missing). */
  get(userId: string): Promise<Account>
  setPlan(userId: string, plan: string, entitlements: string[]): Promise<Account>
  addCredits(userId: string, amount: number): Promise<Account>
  /** Atomically deduct credits. ok=false (no change) if insufficient. */
  deduct(userId: string, cost: number): Promise<{ ok: boolean; remaining: number }>
  /** List all accounts (for the dashboard / admin views). */
  list(): Promise<Account[]>
  /** Append a usage event (fire-and-forget analytics). */
  recordEvent(e: UsageEvent): Promise<void>
  /** Aggregate usage analytics for the dashboard. */
  analytics(): Promise<Analytics>
}

// Plans → entitlements. (Later: per-project, defined in a dashboard.)
export const PLAN_ENTITLEMENTS: Record<string, string[]> = {
  free: [],
  pro: ["pro"],
}

export const STARTING_FREE_CREDITS = 5
