// Shared types & config for PayKit (no runtime deps → safe to import anywhere).

export interface Account {
  userId: string
  plan: string
  credits: number
  entitlements: string[]
}

/** A merchant project — the multi-tenant boundary. Each has its own keys & data. */
export interface Project {
  id: string
  name: string
  publishableKey: string // pk_live_… — safe in the browser / embed
  secretKey: string // sk_live_… — server only
  secureMetering: boolean // when true, /meter requires the secret key (server-side only)
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
  /** List a project's accounts (for the dashboard / admin views). */
  list(projectId: string): Promise<Account[]>
  /** Append a usage event (fire-and-forget analytics). */
  recordEvent(e: UsageEvent): Promise<void>
  /** Aggregate a project's usage analytics for the dashboard. */
  analytics(projectId: string): Promise<Analytics>
  /** Create a new project (owned by ownerId) with freshly-generated keys. */
  createProject(name: string, ownerId: string): Promise<Project>
  /** Resolve a project from a publishable or secret key. */
  getProjectByKey(key: string): Promise<Project | null>
  /** List the projects owned by a given account. */
  listProjectsByOwner(ownerId: string): Promise<Project[]>
  /** Fetch a single project by id. */
  getProject(id: string): Promise<Project | null>
  /** Toggle whether /meter requires the secret key for this project. */
  setSecureMetering(projectId: string, value: boolean): Promise<void>
}

// Internal account ids are namespaced "<projectId>:<userId>" so the same userId
// can exist independently across projects. These helpers compose/split that key.
export function scopedId(projectId: string, userId: string): string {
  return `${projectId}:${userId}`
}
export function splitId(scoped: string): { projectId: string; userId: string } {
  const i = scoped.indexOf(":")
  if (i < 0) return { projectId: "default", userId: scoped }
  return { projectId: scoped.slice(0, i), userId: scoped.slice(i + 1) }
}

export const DEFAULT_PROJECT_ID = "default"

// Plans → entitlements. (Later: per-project, defined in a dashboard.)
export const PLAN_ENTITLEMENTS: Record<string, string[]> = {
  free: [],
  pro: ["pro"],
}

export const STARTING_FREE_CREDITS = 5
