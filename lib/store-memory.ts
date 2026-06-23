import { type Account, type Analytics, type Store, type UsageEvent, STARTING_FREE_CREDITS } from "./types"

// In-memory store — local dev / no DATABASE_URL. Resets on restart.
export class MemoryStore implements Store {
  private accounts = new Map<string, Account>()
  private events: UsageEvent[] = []

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

  async list() {
    return [...this.accounts.values()]
  }

  async recordEvent(e: UsageEvent) {
    this.events.push(e)
  }

  async analytics(): Promise<Analytics> {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const ts = (e: UsageEvent) => new Date(e.at).getTime()
    const meter = this.events.filter((e) => e.kind === "meter")
    const grant = this.events.filter((e) => e.kind === "grant")

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
      recent: [...this.events].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6),
    }
  }
}
