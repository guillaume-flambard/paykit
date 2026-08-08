import { describe, it, expect } from "vitest"
import {
  getAccount,
  meter,
  grantCredits,
  setPlan,
  setStripeCustomer,
  createProject,
  projectFromKey,
  hasAccess,
} from "@/lib/paykit-core"
import { DEFAULT_PROJECT_ID } from "@/lib/types"

const u = () => "core_" + Math.random().toString(36).slice(2, 10)

describe("paykit-core (billing engine, in-memory store)", () => {
  it("returns a default free account", async () => {
    const a = await getAccount(u())
    expect(a.plan).toBe("free")
    expect(a.credits).toBe(5)
  })

  it("meters credits and blocks at zero", async () => {
    const id = u()
    for (let i = 0; i < 5; i++) {
      const r = await meter(id, "image_gen")
      expect(r.ok).toBe(true)
    }
    const blocked = await meter(id, "image_gen")
    expect(blocked.ok).toBe(false)
    expect(blocked.blocked).toBe(true)
    expect(blocked.remaining).toBe(0)
  })

  it("meters a custom cost", async () => {
    const r = await meter(u(), "hd_upscale", 4)
    expect(r).toEqual({ ok: true, remaining: 1 })
  })

  it("refuses a non-positive, non-integer or oversized cost (free-ride guard)", async () => {
    const id = u()
    await grantCredits(id, 10)
    for (const bad of [0, -5, 1.5, 1_000_001]) {
      await expect(meter(id, "chat", bad)).rejects.toThrow(/positive integer/)
    }
    expect((await getAccount(id)).credits).toBe(15) // 5 default + 10 granted — nothing minted or lost
  })

  it("grants credits", async () => {
    const a = await grantCredits(u(), 100)
    expect(a.credits).toBe(105)
  })

  it("sets plan entitlements", async () => {
    const a = await setPlan(u(), "pro")
    expect(a.plan).toBe("pro")
    expect(a.entitlements).toEqual(["pro"])
  })

  it("persists the Stripe customer id", async () => {
    const id = u()
    await setStripeCustomer(id, "cus_abc")
    expect((await getAccount(id)).stripeCustomerId).toBe("cus_abc")
  })

  it("resolves projects from keys (none → demo, valid → project, unknown → null)", async () => {
    expect(await projectFromKey(null)).toBe(DEFAULT_PROJECT_ID)
    expect(await projectFromKey(undefined)).toBe(DEFAULT_PROJECT_ID)
    const p = await createProject("Acme", "owner_1")
    expect(await projectFromKey(p.publishableKey)).toBe(p.id)
    expect(await projectFromKey(p.secretKey)).toBe(p.id)
    expect(await projectFromKey("pk_bogus")).toBeNull()
  })

  it("checks entitlement access", async () => {
    const id = u()
    expect(await hasAccess(id, "free")).toBe(true)
    expect(await hasAccess(id, "pro")).toBe(false)
    await setPlan(id, "pro")
    expect(await hasAccess(id, "pro")).toBe(true)
  })
})
