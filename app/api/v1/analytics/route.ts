import { NextResponse } from "next/server"
import { analytics, listAccounts } from "@/lib/paykit-core"
import { resolveProject } from "@/lib/api"
import { splitId } from "@/lib/types"

// GET /api/v1/analytics?key=...  — usage analytics + account stats, scoped by key.
// MRR is derived (pro subscribers × $19). No key → demo project, invalid key → 401.
export async function GET(req: Request) {
  const projectId = await resolveProject(req)
  if (!projectId) return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
  const [data, accounts] = await Promise.all([analytics(projectId), listAccounts(projectId)])
  const pro = accounts.filter((a) => a.plan === "pro").length
  return NextResponse.json({
    ...data,
    recent: data.recent.map((e) => ({ ...e, userId: splitId(e.userId).userId })),
    stats: {
      total: accounts.length,
      pro,
      mrr: pro * 19,
      creditsOutstanding: accounts.reduce((s, a) => s + a.credits, 0),
    },
  })
}
