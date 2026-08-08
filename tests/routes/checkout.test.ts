import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const api = vi.hoisted(() => ({ scope: vi.fn() }))
const stripe = vi.hoisted(() => ({ sessionsCreate: vi.fn() }))
vi.mock("@/lib/api", () => api)
vi.mock("stripe", () => ({
  default: class MockStripe {
    get checkout() {
      return { sessions: { create: stripe.sessionsCreate } }
    }
  },
}))

import { POST as checkout } from "@/app/api/v1/checkout/route"

const post = (body: unknown) =>
  new Request("http://localhost/api/v1/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

describe("POST /api/v1/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = "sk_test_x"
  })
  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY
  })

  it("returns 501 when Stripe is not configured", async () => {
    delete process.env.STRIPE_SECRET_KEY
    expect((await checkout(post({ userId: "u", kind: "credits" }))).status).toBe(501)
  })

  it("rejects a missing userId", async () => {
    expect((await checkout(post({ kind: "credits" }))).status).toBe(400)
  })

  it("rejects an unknown kind without charging anything", async () => {
    api.scope.mockResolvedValue({ uid: "proj_x:u" })
    for (const kind of ["garbage", "Pros", "pros", 42, null]) {
      const res = await checkout(post({ userId: "u", kind }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/kind/)
    }
    expect(stripe.sessionsCreate).not.toHaveBeenCalled()
  })

  it("rejects an invalid API key", async () => {
    api.scope.mockResolvedValue({ uid: null })
    expect((await checkout(post({ userId: "u", kind: "credits" }))).status).toBe(401)
  })

  it("creates a credit-pack checkout session", async () => {
    api.scope.mockResolvedValue({ uid: "proj_x:u" })
    stripe.sessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/credits" })
    const res = await checkout(post({ userId: "u", kind: "credits" }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ url: "https://checkout.stripe.com/credits" })
    const [opts] = stripe.sessionsCreate.mock.calls[0]
    expect(opts.mode).toBe("payment")
    expect(opts.line_items[0].price_data.unit_amount).toBe(900)
    expect(opts.line_items[0].price_data.product_data.name).toBe("100 credits")
    expect(opts.metadata).toMatchObject({ userId: "proj_x:u", packCredits: "100" })
  })

  it("creates a pro subscription checkout session", async () => {
    api.scope.mockResolvedValue({ uid: "proj_x:u" })
    stripe.sessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/pro" })
    const res = await checkout(post({ userId: "u", kind: "pro" }))
    expect(res.status).toBe(200)
    const [opts] = stripe.sessionsCreate.mock.calls[0]
    expect(opts.mode).toBe("subscription")
    expect(opts.line_items[0].price_data.unit_amount).toBe(1900)
    expect(opts.metadata).toMatchObject({ userId: "proj_x:u", plan: "pro" })
  })
})
