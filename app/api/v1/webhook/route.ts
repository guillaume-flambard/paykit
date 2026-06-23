import { NextResponse } from "next/server"
import Stripe from "stripe"
import { grantCredits, setPlan } from "@/lib/paykit-core"

// POST /api/v1/webhook — Stripe events → grant credits / set plan.
// Configure the endpoint in Stripe and set STRIPE_WEBHOOK_SECRET.
export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!key || !whSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 501 })
  }

  const stripe = new Stripe(key)
  const signature = req.headers.get("stripe-signature")
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature ?? "", whSecret)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session
      const userId = s.metadata?.userId
      if (userId) {
        if (s.metadata?.packCredits) await grantCredits(userId, Number(s.metadata.packCredits))
        if (s.metadata?.plan) await setPlan(userId, s.metadata.plan)
      }
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.userId
      if (userId) await setPlan(userId, "free")
    }
  } catch (e) {
    console.error("[webhook] handler error", e)
    return NextResponse.json({ error: "Handler error" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
