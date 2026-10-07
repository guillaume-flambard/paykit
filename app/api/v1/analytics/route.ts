import { NextResponse } from "next/server"
import { analytics, listAccounts } from "@/lib/paykit-core"
import { resolveAdminProject } from "@/lib/api"
import { accountStats, splitId } from "@/lib/types"

// GET /api/v1/analytics?key=...  — usage analytics + account stats, scoped by key.
// MRR is derived (pro subscribers × PRO_PRICE_USD). No key → demo project; publishable or invalid key → 401.
export async function GET(req: Request) {
  const projectId = await resolveAdminProject(req)
  if (!projectId) return NextResponse.json({ error: "Secret API key required" }, { status: 401 })
  const [data, accounts] = await Promise.all([analytics(projectId), listAccounts(projectId)])
  return NextResponse.json({
    ...data,
    recent: data.recent.map((e) => ({ ...e, userId: splitId(e.userId).userId })),
    stats: accountStats(accounts),
  })
}
