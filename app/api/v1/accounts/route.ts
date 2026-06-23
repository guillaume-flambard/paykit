import { NextResponse } from "next/server"
import { listAccounts } from "@/lib/paykit-core"

// GET /api/v1/accounts — list accounts + summary stats for the dashboard.
// MVP: unauthenticated & single-tenant (every account in the store). A real
// multi-tenant build would scope this to the merchant behind a secret key.
export async function GET() {
  const accounts = await listAccounts()
  const pro = accounts.filter((a) => a.plan === "pro").length
  const creditsOutstanding = accounts.reduce((sum, a) => sum + a.credits, 0)
  return NextResponse.json({
    accounts,
    stats: {
      total: accounts.length,
      pro,
      free: accounts.length - pro,
      creditsOutstanding,
      mrr: pro * 19,
    },
  })
}
