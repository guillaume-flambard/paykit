import { NextResponse } from "next/server"
import { grantCredits, setPlan, getAccount } from "@/lib/paykit-core"

// POST /api/v1/credits  { userId, amount?, plan? }
// MVP stand-in for the Stripe webhook: simulates a successful purchase / upgrade.
export async function POST(req: Request) {
  try {
    const { userId, amount, plan } = await req.json()
    if (typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }
    if (typeof plan === "string") setPlan(userId, plan)
    if (typeof amount === "number") grantCredits(userId, amount)
    return NextResponse.json(getAccount(userId))
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }
}
