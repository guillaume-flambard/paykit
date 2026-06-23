import { NextResponse } from "next/server"
import { analytics, listAccounts } from "@/lib/paykit-core"

// GET /api/v1/analytics — usage analytics + account-derived stats for the dashboard.
// MVP: unauthenticated & single-tenant. MRR is derived (pro subscribers × $19).
export async function GET() {
  const [data, accounts] = await Promise.all([analytics(), listAccounts()])
  const pro = accounts.filter((a) => a.plan === "pro").length
  return NextResponse.json({
    ...data,
    stats: {
      total: accounts.length,
      pro,
      mrr: pro * 19,
      creditsOutstanding: accounts.reduce((s, a) => s + a.credits, 0),
    },
  })
}
