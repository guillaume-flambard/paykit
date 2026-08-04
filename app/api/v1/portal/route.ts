import { NextResponse } from "next/server"
import Stripe from "stripe"
import { getAccount, setStripeCustomer } from "@/lib/paykit-core"
import { scope } from "@/lib/api"

// POST /api/v1/portal  { userId, key? }
// Opens a Stripe Customer Portal session so the user can manage their
// subscription / payment methods. Same key scoping as /checkout.
export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    return NextResponse.json({ error: "Stripe not configured. Set STRIPE_SECRET_KEY." }, { status: 501 })
  }
  try {
    const body = await req.json()
    const { userId } = body
    if (typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }
    const { uid } = await scope(req, userId, body)
    if (!uid) return NextResponse.json({ error: "Invalid API key" }, { status: 401 })

    const stripe = new Stripe(key)
    let account = await getAccount(uid)
    if (!account.stripeCustomerId) {
      const customer = await stripe.customers.create({ metadata: { userId: uid } })
      account = await setStripeCustomer(uid, customer.id)
    }

    const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin
    const session = await stripe.billingPortal.sessions.create({
      customer: account.stripeCustomerId!,
      return_url: `${base}/?portal=1`,
    })

    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error("[portal]", e)
    return NextResponse.json({ error: "Portal session failed" }, { status: 500 })
  }
}
