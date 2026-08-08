import { randomBytes } from "crypto"
import { type Account, type Analytics, type Project, type Store, type UsageEvent, DEFAULT_PROJECT_ID, STARTING_FREE_CREDITS, splitId } from "./types.js"

// In-memory store — local dev / no DATABASE_URL. Resets on restart.
export class MemoryStore implements Store {
  private accounts = new Map<string, Account>()
  private events: UsageEvent[] = []
  private projects = new Map<string, Project>()
  private projectOwner = new Map<string, string>()

  constructor() {
    this.projects.set(DEFAULT_PROJECT_ID, {
      id: DEFAULT_PROJECT_ID,
      name: "Demo project",
      publishableKey: "pk_live_demo",
      secretKey: "sk_live_demo",
      secureMetering: false,
    })
  }

  private ensure(userId: string): Account {
    let account = this.accounts.get(userId)
    if (!account) {
      account = { userId, plan: "free", credits: STARTING_FREE_CREDITS, entitlements: [] }
      this.accounts.set(userId, account)
    }
    return account
  }

  async get(userId: string) {
    return this.ensure(userId)
  }

  async setPlan(userId: string, plan: string, entitlements: string[]) {
    const a = this.ensure(userId)
    a.plan = plan
    a.entitlements = entitlements
    return a
  }

  async addCredits(userId: string, amount: number) {
    const a = this.ensure(userId)
    a.credits += amount
    return a
  }

  async deduct(userId: string, cost: number) {
    const a = this.ensure(userId)
    if (a.credits < cost) return { ok: false, remaining: a.credits }
    a.credits -= cost
    return { ok: true, remaining: a.credits }
  }

  async list(projectId: string) {
    return [...this.accounts.values()].filter((a) => splitId(a.userId).projectId === projectId)
  }

  async recordEvent(e: UsageEvent) {
    this.events.push(e)
  }

  async analytics(projectId: string): Promise<Analytics> {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const ts = (e: UsageEvent) => new Date(e.at).getTime()
    const scoped = this.events.filter((e) => splitId(e.userId).projectId === projectId)
    const meter = scoped.filter((e) => e.kind === "meter")
    const grant = scoped.filter((e) => e.kind === "grant")

    const counts = new Map<string, number>()
    for (const e of meter) counts.set(e.name, (counts.get(e.name) ?? 0) + 1)
    const topEvents = [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const series: Analytics["series"] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now)
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const start = d.getTime()
      const end = start + 86_400_000
      const inDay = (e: UsageEvent) => ts(e) >= start && ts(e) < end
      series.push({
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        metered: meter.filter(inDay).length,
        granted: grant.filter(inDay).reduce((s, e) => s + e.amount, 0),
      })
    }

    return {
      meteredThisMonth: meter.filter((e) => ts(e) >= monthStart).length,
      creditsSoldThisMonth: grant.filter((e) => ts(e) >= monthStart).reduce((s, e) => s + e.amount, 0),
      topEvents,
      series,
      recent: [...scoped].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6),
    }
  }

  async createProject(name: string, ownerId: string) {
    const id = "proj_" + randomBytes(8).toString("hex")
    const project: Project = {
      id,
      name: name || "Untitled project",
      publishableKey: "pk_live_" + randomBytes(16).toString("hex"),
      secretKey: "sk_live_" + randomBytes(24).toString("hex"),
      secureMetering: false,
    }
    this.projects.set(id, project)
    this.projectOwner.set(id, ownerId)
    return project
  }

  async getProjectByKey(key: string) {
    for (const p of this.projects.values()) {
      if (p.publishableKey === key || p.secretKey === key) return p
    }
    return null
  }

  async listProjectsByOwner(ownerId: string) {
    return [...this.projects.values()].filter((p) => this.projectOwner.get(p.id) === ownerId)
  }

  async getProject(id: string) {
    return this.projects.get(id) ?? null
  }

  async setSecureMetering(projectId: string, value: boolean) {
    const p = this.projects.get(projectId)
    if (p) p.secureMetering = value
  }

  async setStripeCustomer(userId: string, customerId: string) {
    const a = this.ensure(userId)
    a.stripeCustomerId = customerId
    return a
  }
}
