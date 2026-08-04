#!/usr/bin/env node
// Test runner: activates the Postgres store contract whenever a DATABASE_URL
// is available, WITHOUT touching real data. It connects to the direct (non-
// pooled) Neon endpoint with search_path pinned to a dedicated `paykit_test`
// schema, runs vitest with TEST_DATABASE_URL set, then drops that schema.
import { readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { spawn } from "node:child_process"
import pg from "pg"

const root = dirname(fileURLToPath(import.meta.url)) + "/.."
const { Pool } = pg
const postgresOnly = process.argv.includes("--postgres-only")

function databaseUrlFromEnv() {
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8")
    for (const line of raw.split("\n")) {
      if (line.startsWith("DATABASE_URL=")) return line.slice("DATABASE_URL=".length).trim()
    }
  } catch {
    /* no .env.local */
  }
  return process.env.DATABASE_URL || ""
}

async function ensureTestSchema(dbUrl) {
  const direct = dbUrl.replace("-pooler.", ".")
  const testUrl =
    direct +
    (direct.includes("?") ? "&" : "?") +
    "options=-c%20search_path%3Dpaykit_test"
  const pool = new Pool({ connectionString: testUrl, ssl: { rejectUnauthorized: false }, max: 2 })
  pool.on("error", () => {})
  await pool.query("CREATE SCHEMA IF NOT EXISTS paykit_test")
  await pool.end()
  return testUrl
}

async function dropTestSchema(dbUrl) {
  const direct = dbUrl.replace("-pooler.", ".")
  const testUrl = direct + (direct.includes("?") ? "&" : "?") + "options=-c%20search_path%3Dpaykit_test"
  const pool = new Pool({ connectionString: testUrl, ssl: { rejectUnauthorized: false }, max: 2 })
  pool.on("error", () => {})
  try {
    await pool.query("DROP SCHEMA IF EXISTS paykit_test CASCADE")
  } finally {
    await pool.end()
  }
}

const dbUrl = databaseUrlFromEnv()
let testUrl = null

if (dbUrl) {
  try {
    testUrl = await ensureTestSchema(dbUrl)
    console.log("✅ Postgres contract active (dedicated schema paykit_test)")
  } catch (e) {
    console.error(`⚠️  Could not activate Postgres contract: ${e.message}. Falling back to in-memory only.`)
  }
}

const bin = join(root, "node_modules/.bin/vitest")
const args = postgresOnly ? ["run", "tests/store-postgres.test.ts"] : ["run"]
const child = spawn(bin, args, {
  stdio: "inherit",
  env: { ...process.env, ...(testUrl ? { TEST_DATABASE_URL: testUrl } : {}) },
})

child.on("exit", async (code) => {
  if (testUrl) {
    try {
      await dropTestSchema(dbUrl)
    } catch {
      /* best effort */
    }
  }
  process.exit(code ?? 1)
})
