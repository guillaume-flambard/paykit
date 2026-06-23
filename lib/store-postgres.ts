import { Pool } from "pg"
import { type Account, type Store, STARTING_FREE_CREDITS } from "./types"

// Postgres store — used when DATABASE_URL is set. Deduct is atomic (race-safe).
export class PostgresStore implements Store {
  private pool: Pool
  private ready: Promise<void>

  constructor(connectionString: string) {
    const needsSsl = /sslmode=require|neon\.tech|supabase/.test(connectionString)
    this.pool = new Pool({
      connectionString,
      max: 5,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    })
    this.ready = this.init()
  }

  private async init() {
    await this.pool.query(`
      create table if not exists paykit_accounts (
        user_id text primary key,
        plan text not null default 'free',
        credits integer not null default ${STARTING_FREE_CREDITS},
        entitlements jsonb not null default '[]'::jsonb
      )
    `)
  }

  private map(row: { user_id: string; plan: string; credits: number; entitlements: string[] }): Account {
    return { userId: row.user_id, plan: row.plan, credits: row.credits, entitlements: row.entitlements }
  }

  private async ensure(userId: string) {
    await this.ready
    await this.pool.query(`insert into paykit_accounts(user_id) values($1) on conflict do nothing`, [userId])
  }

  async get(userId: string) {
    await this.ensure(userId)
    const { rows } = await this.pool.query(`select * from paykit_accounts where user_id=$1`, [userId])
    return this.map(rows[0])
  }

  async setPlan(userId: string, plan: string, entitlements: string[]) {
    await this.ready
    const { rows } = await this.pool.query(
      `insert into paykit_accounts(user_id, plan, entitlements) values($1,$2,$3::jsonb)
       on conflict(user_id) do update set plan=excluded.plan, entitlements=excluded.entitlements
       returning *`,
      [userId, plan, JSON.stringify(entitlements)],
    )
    return this.map(rows[0])
  }

  async addCredits(userId: string, amount: number) {
    await this.ensure(userId)
    const { rows } = await this.pool.query(
      `update paykit_accounts set credits = credits + $2 where user_id=$1 returning *`,
      [userId, amount],
    )
    return this.map(rows[0])
  }

  async deduct(userId: string, cost: number) {
    await this.ensure(userId)
    const { rows } = await this.pool.query(
      `update paykit_accounts set credits = credits - $2 where user_id=$1 and credits >= $2 returning credits`,
      [userId, cost],
    )
    if (rows.length === 0) {
      const { rows: r2 } = await this.pool.query(`select credits from paykit_accounts where user_id=$1`, [userId])
      return { ok: false, remaining: r2[0]?.credits ?? 0 }
    }
    return { ok: true, remaining: rows[0].credits }
  }

  async list() {
    await this.ready
    const { rows } = await this.pool.query(`select * from paykit_accounts order by user_id limit 500`)
    return rows.map((r) => this.map(r))
  }
}
