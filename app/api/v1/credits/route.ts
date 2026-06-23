import { NextResponse } from "next/server"
import { grantCredits, setPlan, getAccount } from "@/lib/paykit-core"
import { scope } from "@/lib/api"

// POST /api/v1/credits  { userId, amount?, plan?, key? }
// Local stand-in for the Stripe webhook: simulate a successful purchase / upgrade.
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, amount, plan } = body
    if (typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }
    const { uid } = await scope(req, userId, body)
    if (!uid) return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
    if (typeof plan === "string") await setPlan(uid, plan)
    if (typeof amount === "number") await grantCredits(uid, amount)
    const account = await getAccount(uid)
    return NextResponse.json({ ...account, userId })
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }
}
