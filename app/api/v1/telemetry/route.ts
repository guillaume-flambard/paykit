// POST /api/v1/telemetry  { kind: "error"|"warn"|"info", message, url?, stack? }
// GET  /api/v1/telemetry → recent ring buffer.
//
// Runtime observability (superflow Phase 5): the client reports errors
// best-effort (no secrets, sanitized, bounded). The loop reads
// `.superflow/runtime-errors.md` as post-ship feedback (Phase 5 → 4/6).
import { NextResponse } from "next/server"
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs"
import path from "node:path"

const MAX = 200
const RING: { at: string; kind: string; message: string; url?: string }[] = []
const FILE = path.join(process.cwd(), ".superflow", "runtime-errors.md")
const HEADER = "# Runtime errors — post-ship feedback (superflow Phase 5)\n| at | kind | message | url |\n|---|---|---|---|\n"

function ensureFile() {
  const dir = path.dirname(FILE)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  if (!existsSync(FILE)) appendFileSync(FILE, HEADER)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const kind = body.kind === "warn" || body.kind === "info" ? body.kind : "error"
    const message = typeof body.message === "string" ? body.message.slice(0, 500) : ""
    if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 })
    const url = typeof body.url === "string" ? body.url.slice(0, 500) : undefined
    const entry = { at: new Date().toISOString(), kind, message, url }
    RING.push(entry)
    if (RING.length > MAX) RING.shift()
    try {
      ensureFile()
      appendFileSync(FILE, `| ${entry.at} | ${kind} | ${message.replace(/\|/g, "\\|")} | ${url ?? ""} |\n`)
    } catch {
      /* best-effort — never break billing */
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }
}

export async function GET() {
  return NextResponse.json({ recent: RING })
}

export { FILE as runtimeErrorsFile }
