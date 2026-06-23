import { NextResponse } from "next/server"
import { grantCredits, setPlan, getAccount } from "@/lib/paykit-core"

// POST /api/v1/credits  { userId, amount?, plan? }
// Local stand-in for the Stripe webhook: simulate a successful purchase / upgrade.
export async function POST(req: Request) {
  try {
    const { userId, amount, plan } = await req.json()
    if (typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }
    if (typeof plan === "string") await setPlan(userId, plan)
    if (typeof amount === "number") await grantCredits(userId, amount)
    return NextResponse.json(await getAccount(userId))
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }
}
