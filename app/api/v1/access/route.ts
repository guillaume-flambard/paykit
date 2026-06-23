import { NextResponse } from "next/server"
import { getAccount } from "@/lib/paykit-core"

// GET /api/v1/access?userId=...  → { userId, plan, credits, entitlements }
export async function GET(req: Request) {
  const userId = new URL(req.url).searchParams.get("userId")
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }
  return NextResponse.json(getAccount(userId))
}
