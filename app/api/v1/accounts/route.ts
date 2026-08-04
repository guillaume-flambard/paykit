import { NextResponse } from "next/server"
import { listAccounts } from "@/lib/paykit-core"
import { resolveProject } from "@/lib/api"
import { accountStats, splitId } from "@/lib/types"

// GET /api/v1/accounts?key=...  — list the project's accounts + summary stats.
// Scoped by the API key; no key → demo project, invalid key → 401.
export async function GET(req: Request) {
  const projectId = await resolveProject(req)
  if (!projectId) return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
  const accounts = (await listAccounts(projectId)).map((a) => ({ ...a, userId: splitId(a.userId).userId }))
  const stats = accountStats(accounts)
  return NextResponse.json({
    accounts,
    stats: { ...stats, free: stats.total - stats.pro },
  })
}
