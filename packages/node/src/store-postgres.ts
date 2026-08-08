import { randomBytes } from "crypto"
import { Pool } from "pg"
import { type Account, type Analytics, type Project, type Store, type UsageEvent, DEFAULT_PROJECT_ID, STARTING_FREE_CREDITS, splitId } from "./types.js"

// Postgres store — used when DATABASE_URL is set. Deduct is atomic (race-safe).
// Accounts & events are scoped per project via a project_id column; account ids
// are namespaced "<projectId>:<userId>" so the same userId is isolated per project.
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
    await this.pool.query(`
      create table if not exists paykit_projects (
        id text primary key,
        name text not null,
        publishable_key text unique not null,
        secret_key text unique not null,
        created_at timestamptz not null default now()
      )
    `)
    await this.pool.query(`alter table paykit_projects add column if not exists owner_id text not null default 'demo'`)
    await this.pool.query(`alter table paykit_projects add column if not exists secure_metering boolean not null default false`)
    await this.pool.query(`create index if not exists paykit_projects_owner on paykit_projects(owner_id)`)
    // Idempotent multi-tenant migration: add project_id to the existing tables.
    await this.pool.query(`alter table paykit_accounts add column if not exists project_id text not null default '${DEFAULT_PROJECT_ID}'`)
    await this.pool.query(`alter table paykit_accounts add column if not exists stripe_customer_id text`)
    await this.pool.query(`alter table paykit_events add column if not exists project_id text not null default '${DEFAULT_PROJECT_ID}'`)
    await this.pool.query(`create index if not exists paykit_accounts_project on paykit_accounts(project_id)`)
    await this.pool.query(`create index if not exists paykit_events_project on paykit_events(project_id)`)
    // Seed the fallback project so the demo key (and key-less calls) resolve.
    await this.pool.query(
      `insert into paykit_projects(id, name, publishable_key, secret_key)
       values('${DEFAULT_PROJECT_ID}', 'Demo project', 'pk_live_demo', 'sk_live_demo') on conflict do nothing`,
    )
  }

  private map(row: { user_id: string; plan: string; credits: number; entitlements: string[]; stripe_customer_id?: string }): Account {
    return { userId: row.user_id, plan: row.plan, credits: row.credits, entitlements: row.entitlements, stripeCustomerId: row.stripe_customer_id ?? undefined }
  }

  private mapProject(row: { id: string; name: string; publishable_key: string; secret_key: string; secure_metering?: boolean }): Project {
    return { id: row.id, name: row.name, publishableKey: row.publishable_key, secretKey: row.secret_key, secureMetering: !!row.secure_metering }
  }

  private async ensure(userId: string) {
    await this.ready
    await this.pool.query(`insert into paykit_accounts(user_id, project_id) values($1,$2) on conflict do nothing`, [
      userId,
      splitId(userId).projectId,
    ])
  }

  async get(userId: string) {
    await this.ensure(userId)
    const { rows } = await this.pool.query(`select * from paykit_accounts where user_id=$1`, [userId])
    return this.map(rows[0])
  }

  async setPlan(userId: string, plan: string, entitlements: string[]) {
    await this.ready
    const { rows } = await this.pool.query(
      `insert into paykit_accounts(user_id, project_id, plan, entitlements) values($1,$2,$3,$4::jsonb)
       on conflict(user_id) do update set plan=excluded.plan, entitlements=excluded.entitlements
       returning *`,
      [userId, splitId(userId).projectId, plan, JSON.stringify(entitlements)],
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

  async list(projectId: string) {
    await this.ready
    const { rows } = await this.pool.query(`select * from paykit_accounts where project_id=$1 order by user_id limit 500`, [projectId])
    return rows.map((r) => this.map(r))
  }

  async recordEvent(e: UsageEvent) {
    await this.ready
    await this.pool.query(
      `insert into paykit_events(user_id, project_id, kind, name, amount, created_at) values($1,$2,$3,$4,$5,$6)`,
      [e.userId, splitId(e.userId).projectId, e.kind, e.name, e.amount, e.at],
    )
  }

  async analytics(projectId: string): Promise<Analytics> {
    await this.ready
    const p = [projectId]
    const [metered, sold, top, series, recent] = await Promise.all([
      this.pool.query(`select count(*)::int c from paykit_events where project_id=$1 and kind='meter' and created_at >= date_trunc('month', now())`, p),
      this.pool.query(`select coalesce(sum(amount),0)::int c from paykit_events where project_id=$1 and kind='grant' and created_at >= date_trunc('month', now())`, p),
      this.pool.query(`select name, count(*)::int count from paykit_events where project_id=$1 and kind='meter' group by name order by count desc limit 5`, p),
      this.pool.query(
        `select to_char(current_date - gs, 'FMMM/FMDD') label,
                coalesce(m.c, 0)::int metered,
                coalesce(g.s, 0)::int granted
         from generate_series(13, 0, -1) gs
         left join (select created_at::date dt, count(*) c from paykit_events where project_id=$1 and kind='meter' group by 1) m on m.dt = current_date - gs
         left join (select created_at::date dt, sum(amount) s from paykit_events where project_id=$1 and kind='grant' group by 1) g on g.dt = current_date - gs
         order by gs desc`,
        p,
      ),
      this.pool.query(`select user_id, kind, name, amount, created_at from paykit_events where project_id=$1 order by created_at desc limit 6`, p),
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

  async createProject(name: string, ownerId: string) {
    await this.ready
    const id = "proj_" + randomBytes(8).toString("hex")
    const publishableKey = "pk_live_" + randomBytes(16).toString("hex")
    const secretKey = "sk_live_" + randomBytes(24).toString("hex")
    const { rows } = await this.pool.query(
      `insert into paykit_projects(id, name, publishable_key, secret_key, owner_id) values($1,$2,$3,$4,$5) returning *`,
      [id, name || "Untitled project", publishableKey, secretKey, ownerId],
    )
    return this.mapProject(rows[0])
  }

  async getProjectByKey(key: string) {
    await this.ready
    const { rows } = await this.pool.query(`select * from paykit_projects where publishable_key=$1 or secret_key=$1 limit 1`, [key])
    return rows[0] ? this.mapProject(rows[0]) : null
  }

  async listProjectsByOwner(ownerId: string) {
    await this.ready
    const { rows } = await this.pool.query(`select * from paykit_projects where owner_id=$1 order by created_at desc limit 100`, [ownerId])
    return rows.map((r) => this.mapProject(r))
  }

  async getProject(id: string) {
    await this.ready
    const { rows } = await this.pool.query(`select * from paykit_projects where id=$1 limit 1`, [id])
    return rows[0] ? this.mapProject(rows[0]) : null
  }

  async setSecureMetering(projectId: string, value: boolean) {
    await this.ready
    await this.pool.query(`update paykit_projects set secure_metering=$2 where id=$1`, [projectId, value])
  }

  async setStripeCustomer(userId: string, customerId: string) {
    await this.ready
    const { rows } = await this.pool.query(
      `insert into paykit_accounts(user_id, project_id, stripe_customer_id) values($1,$2,$3)
       on conflict(user_id) do update set stripe_customer_id=excluded.stripe_customer_id
       returning *`,
      [userId, splitId(userId).projectId, customerId],
    )
    return this.map(rows[0])
  }
}
