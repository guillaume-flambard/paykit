import { NextResponse } from "next/server"
import { getAccount } from "@/lib/paykit-core"
import { scope } from "@/lib/api"

// GET /api/v1/access?userId=...&key=pk_...  → { userId, plan, credits, entitlements }
export async function GET(req: Request) {
  const userId = new URL(req.url).searchParams.get("userId")
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }
  const { uid } = await scope(req, userId)
  const account = await getAccount(uid)
  return NextResponse.json({ ...account, userId }) // return the caller's id, not the internal one
}
