import { NextResponse } from "next/server"
import { listAccounts } from "@/lib/paykit-core"
import { resolveAdminProject } from "@/lib/api"
import { accountStats, splitId } from "@/lib/types"

// GET /api/v1/accounts?key=...  — list the project's accounts + summary stats.
// Needs a SECRET key (sk_); a publishable key is refused. No key → demo project; publishable or invalid key → 401.
export async function GET(req: Request) {
  const projectId = await resolveAdminProject(req)
  if (!projectId) return NextResponse.json({ error: "Secret API key required" }, { status: 401 })
  const accounts = (await listAccounts(projectId)).map((a) => ({ ...a, userId: splitId(a.userId).userId }))
  const stats = accountStats(accounts)
  return NextResponse.json({
    accounts,
    stats: { ...stats, free: stats.total - stats.pro },
  })
}
