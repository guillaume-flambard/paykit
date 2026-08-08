import { NextResponse } from "next/server"
import { grantCredits, setPlan, getAccount } from "@/lib/paykit-core"
import { scope } from "@/lib/api"
import { DEFAULT_PROJECT_ID, PLAN_ENTITLEMENTS } from "@/lib/types"

// POST /api/v1/credits  { userId, amount?, plan?, key? }
// Local stand-in for the Stripe webhook: simulate a successful purchase / upgrade.
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, amount, plan } = body
    if (typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }
    if (amount !== undefined && (typeof amount !== "number" || !Number.isInteger(amount) || amount < 1 || amount > 1_000_000)) {
      return NextResponse.json({ error: "amount must be a positive integer ≤ 1000000" }, { status: 400 })
    }
    if (plan !== undefined && (typeof plan !== "string" || !(plan in PLAN_ENTITLEMENTS))) {
      return NextResponse.json({ error: "unknown plan" }, { status: 400 })
    }
    const { uid, projectId, secret } = await scope(req, userId, body)
    if (!uid) return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
    // Granting credits / changing plan adds value → require the secret key.
    // The demo project stays open as a public sandbox.
    if (!secret && projectId !== DEFAULT_PROJECT_ID) {
      return NextResponse.json({ error: "Granting credits requires your secret key (server-side)" }, { status: 403 })
    }
    if (typeof plan === "string") await setPlan(uid, plan)
    if (typeof amount === "number") await grantCredits(uid, amount)
    const account = await getAccount(uid)
    return NextResponse.json({ ...account, userId })
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }
}
