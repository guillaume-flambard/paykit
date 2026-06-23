import { NextResponse } from "next/server"
import { listAccounts, projectFromKey } from "@/lib/paykit-core"
import { splitId } from "@/lib/types"

// GET /api/v1/accounts?key=...  — list the project's accounts + summary stats.
// Scoped by the API key (publishable or secret); falls back to the demo project.
export async function GET(req: Request) {
  const projectId = await projectFromKey(new URL(req.url).searchParams.get("key"))
  const accounts = (await listAccounts(projectId)).map((a) => ({ ...a, userId: splitId(a.userId).userId }))
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
