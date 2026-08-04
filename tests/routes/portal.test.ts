import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const api = vi.hoisted(() => ({ scope: vi.fn() }))
const stripe = vi.hoisted(() => ({ customerCreate: vi.fn(), portalCreate: vi.fn() }))
vi.mock("@/lib/api", () => api)
vi.mock("stripe", () => ({
  default: class MockStripe {
    get customers() {
      return { create: stripe.customerCreate }
    }
    get billingPortal() {
      return { sessions: { create: stripe.portalCreate } }
    }
  },
}))

// Real core + in-memory store (setup.ts), so the ledger path is exercised too.
import { POST as portal } from "@/app/api/v1/portal/route"
import { getAccount, setStripeCustomer } from "@/lib/paykit-core"

const uid = () => "proj_x:" + "user_" + Math.random().toString(36).slice(2, 10)

const post = (body: unknown) =>
  new Request("http://localhost/api/v1/portal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

describe("POST /api/v1/portal (Stripe Customer Portal)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = "sk_test_x"
  })
  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY
  })

  it("returns 501 when Stripe is not configured", async () => {
    delete process.env.STRIPE_SECRET_KEY
    expect((await portal(post({ userId: "u" }))).status).toBe(501)
  })

  it("rejects a missing userId", async () => {
    expect((await portal(post({}))).status).toBe(400)
  })

  it("rejects an invalid API key", async () => {
    api.scope.mockResolvedValue({ uid: null })
    expect((await portal(post({ userId: "u" }))).status).toBe(401)
  })

  it("creates a Stripe Customer on first use, persists it, then opens the portal", async () => {
    const u = uid()
    api.scope.mockResolvedValue({ uid: u })
    stripe.customerCreate.mockResolvedValue({ id: "cus_new" })
    stripe.portalCreate.mockResolvedValue({ url: "https://billing.stripe.com/session" })

    const res = await portal(post({ userId: "u" }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ url: "https://billing.stripe.com/session" })

    expect(stripe.customerCreate).toHaveBeenCalledWith({ metadata: { userId: u } })
    expect(stripe.portalCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_new", return_url: "http://localhost/?portal=1" }),
    )
    expect((await getAccount(u)).stripeCustomerId).toBe("cus_new")
  })

  it("reuses an existing Stripe Customer", async () => {
    const u = uid()
    api.scope.mockResolvedValue({ uid: u })
    await setStripeCustomer(u, "cus_existing")
    stripe.portalCreate.mockResolvedValue({ url: "https://billing.stripe.com/session" })

    const res = await portal(post({ userId: "u" }))
    expect(res.status).toBe(200)
    expect(stripe.customerCreate).not.toHaveBeenCalled()
    expect(stripe.portalCreate).toHaveBeenCalledWith(expect.objectContaining({ customer: "cus_existing" }))
  })
})
