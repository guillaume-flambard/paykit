import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const stripe = vi.hoisted(() => ({ constructEvent: vi.fn() }))
vi.mock("stripe", () => ({
  default: class MockStripe {
    get webhooks() {
      return { constructEvent: stripe.constructEvent }
    }
  },
}))

// Real core + in-memory store: the webhook fulfils the actual ledger.
import { POST as webhook } from "@/app/api/v1/webhook/route"
import { getAccount } from "@/lib/paykit-core"

const uid = () => "proj_x:" + "user_" + Math.random().toString(36).slice(2, 10)

const stripeEvent = (type: string, object: unknown) => ({ type, data: { object } })

const request = (body: string = "{}") =>
  new Request("http://localhost/api/v1/webhook", {
    method: "POST",
    headers: { "stripe-signature": "sig" },
    body,
  })

describe("POST /api/v1/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = "sk_test_x"
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"
  })
  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_WEBHOOK_SECRET
  })

  it("returns 501 when Stripe is not configured", async () => {
    delete process.env.STRIPE_SECRET_KEY
    expect((await webhook(request())).status).toBe(501)
  })

  it("rejects an invalid signature", async () => {
    stripe.constructEvent.mockImplementation(() => {
      throw new Error("bad signature")
    })
    expect((await webhook(request())).status).toBe(400)
  })

  it("fulfils a completed checkout: customer, credits and plan", async () => {
    const u = uid()
    stripe.constructEvent.mockReturnValue(
      stripeEvent("checkout.session.completed", {
        customer: "cus_1",
        metadata: { userId: u, packCredits: "100", plan: "pro" },
      }),
    )
    const res = await webhook(request())
    expect(res.status).toBe(200)
    const a = await getAccount(u)
    expect(a.stripeCustomerId).toBe("cus_1")
    expect(a.credits).toBe(105) // 5 starting + 100 granted
    expect(a.plan).toBe("pro")
    expect(a.entitlements).toEqual(["pro"])
  })

  it("ignores a checkout without a userId", async () => {
    const before = await getAccount("some-unknown-user")
    stripe.constructEvent.mockReturnValue(
      stripeEvent("checkout.session.completed", { customer: "cus_1", metadata: {} }),
    )
    const res = await webhook(request())
    expect(res.status).toBe(200)
    const after = await getAccount("some-unknown-user")
    expect(after).toEqual(before)
  })

  it("reverts the plan to free on subscription cancellation", async () => {
    const u = uid()
    await getAccount(u)
    stripe.constructEvent.mockReturnValue(
      stripeEvent("customer.subscription.deleted", { metadata: { userId: u } }),
    )
    const res = await webhook(request())
    expect(res.status).toBe(200)
    expect((await getAccount(u)).plan).toBe("free")
  })
})
