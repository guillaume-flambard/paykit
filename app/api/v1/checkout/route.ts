import { NextResponse } from "next/server"
import Stripe from "stripe"

// POST /api/v1/checkout  { userId, kind: "credits" | "pro" }
// Creates a Stripe Checkout Session (inline prices — no dashboard setup needed).
export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    return NextResponse.json({ error: "Stripe not configured. Set STRIPE_SECRET_KEY." }, { status: 501 })
  }
  try {
    const { userId, kind } = await req.json()
    if (typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }
    const stripe = new Stripe(key)
    const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin
    const urls = { success_url: `${base}/?paid=1`, cancel_url: `${base}/?canceled=1` }

    const session =
      kind === "pro"
        ? await stripe.checkout.sessions.create({
            mode: "subscription",
            line_items: [
              {
                price_data: {
                  currency: "usd",
                  product_data: { name: "PayKit Pro" },
                  unit_amount: 1900,
                  recurring: { interval: "month" },
                },
                quantity: 1,
              },
            ],
            metadata: { userId, plan: "pro" },
            subscription_data: { metadata: { userId, plan: "pro" } },
            ...urls,
          })
        : await stripe.checkout.sessions.create({
            mode: "payment",
            line_items: [
              {
                price_data: {
                  currency: "usd",
                  product_data: { name: "100 credits" },
                  unit_amount: 900,
                },
                quantity: 1,
              },
            ],
            metadata: { userId, packCredits: "100" },
            ...urls,
          })

    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error("[checkout]", e)
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 })
  }
}
