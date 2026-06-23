import { type Account, type Store, STARTING_FREE_CREDITS } from "./types"

// In-memory store — local dev / no DATABASE_URL. Resets on restart.
export class MemoryStore implements Store {
  private accounts = new Map<string, Account>()

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
}
