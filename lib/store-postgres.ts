import { Pool } from "pg"
import { type Account, type Analytics, type Store, type UsageEvent, STARTING_FREE_CREDITS } from "./types"

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
    await this.pool.query(`
      create table if not exists paykit_events (
        id bigserial primary key,
        user_id text not null,
        kind text not null,
        name text not null default '',
        amount integer not null default 0,
        created_at timestamptz not null default now()
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

  async recordEvent(e: UsageEvent) {
    await this.ready
    await this.pool.query(
      `insert into paykit_events(user_id, kind, name, amount, created_at) values($1,$2,$3,$4,$5)`,
      [e.userId, e.kind, e.name, e.amount, e.at],
    )
  }

  async analytics(): Promise<Analytics> {
    await this.ready
    const [metered, sold, top, series, recent] = await Promise.all([
      this.pool.query(`select count(*)::int c from paykit_events where kind='meter' and created_at >= date_trunc('month', now())`),
      this.pool.query(`select coalesce(sum(amount),0)::int c from paykit_events where kind='grant' and created_at >= date_trunc('month', now())`),
      this.pool.query(`select name, count(*)::int count from paykit_events where kind='meter' group by name order by count desc limit 5`),
      this.pool.query(`
        select to_char(current_date - gs, 'FMMM/FMDD') label,
               coalesce(m.c, 0)::int metered,
               coalesce(g.s, 0)::int granted
        from generate_series(13, 0, -1) gs
        left join (select created_at::date dt, count(*) c from paykit_events where kind='meter' group by 1) m on m.dt = current_date - gs
        left join (select created_at::date dt, sum(amount) s from paykit_events where kind='grant' group by 1) g on g.dt = current_date - gs
        order by gs desc
      `),
      this.pool.query(`select user_id, kind, name, amount, created_at from paykit_events order by created_at desc limit 6`),
    ])
    return {
      meteredThisMonth: metered.rows[0].c,
      creditsSoldThisMonth: sold.rows[0].c,
      topEvents: top.rows,
      series: series.rows,
      recent: recent.rows.map((r) => ({
        userId: r.user_id,
        kind: r.kind,
        name: r.name,
        amount: r.amount,
        at: new Date(r.created_at).toISOString(),
      })),
    }
  }
}
