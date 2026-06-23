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

export interface Store {
  /** Get (creating with defaults if missing). */
  get(userId: string): Promise<Account>
  setPlan(userId: string, plan: string, entitlements: string[]): Promise<Account>
  addCredits(userId: string, amount: number): Promise<Account>
  /** Atomically deduct credits. ok=false (no change) if insufficient. */
  deduct(userId: string, cost: number): Promise<{ ok: boolean; remaining: number }>
}

// Plans → entitlements. (Later: per-project, defined in a dashboard.)
export const PLAN_ENTITLEMENTS: Record<string, string[]> = {
  free: [],
  pro: ["pro"],
}

export const STARTING_FREE_CREDITS = 5
