import { describe, it, expect, beforeEach } from "vitest"
import type { Store } from "@/lib/types"
import { scopedId } from "@/lib/types"

// Shared behavioural contract, run against every Store implementation.
export function runStoreContract(create: () => Store) {
  let store: Store
  const uid = () => "user_" + Math.random().toString(36).slice(2, 10)

  describe("store contract", () => {
    beforeEach(() => {
      store = create()
    })

    it("creates a default free account with starting credits", async () => {
      const a = await store.get(uid())
      expect(a.plan).toBe("free")
      expect(a.credits).toBe(5)
      expect(a.entitlements).toEqual([])
      expect(a.stripeCustomerId).toBeUndefined()
    })

    it("adds credits", async () => {
      const a = await store.addCredits(uid(), 100)
      expect(a.credits).toBe(105)
    })

    it("deducts atomically and never goes negative", async () => {
      const u = uid()
      expect(await store.deduct(u, 5)).toEqual({ ok: true, remaining: 0 })
      expect(await store.deduct(u, 1)).toEqual({ ok: false, remaining: 0 })
    })

    it("sets plan and entitlements", async () => {
      const a = await store.setPlan(uid(), "pro", ["pro"])
      expect(a.plan).toBe("pro")
      expect(a.entitlements).toEqual(["pro"])
    })

    it("stores the Stripe customer id and upserts for new users", async () => {
      const u = uid()
      const a = await store.setStripeCustomer(u, "cus_123")
      expect(a.stripeCustomerId).toBe("cus_123")
      expect((await store.get(u)).stripeCustomerId).toBe("cus_123")
    })

    it("creates projects with fresh publishable/secret keys", async () => {
      const p = await store.createProject("Acme", "owner_1")
      expect(p.id).toMatch(/^proj_/)
      expect(p.publishableKey).toMatch(/^pk_live_/)
      expect(p.secretKey).toMatch(/^sk_live_/)
      expect(p.secureMetering).toBe(false)
      const p2 = await store.createProject("Acme", "owner_1")
      expect(p2.id).not.toBe(p.id)
      expect(p2.publishableKey).not.toBe(p.publishableKey)
    })

    it("resolves projects by publishable and secret key", async () => {
      const p = await store.createProject("Acme", "owner_1")
      expect((await store.getProjectByKey(p.publishableKey))?.id).toBe(p.id)
      expect((await store.getProjectByKey(p.secretKey))?.id).toBe(p.id)
      expect(await store.getProjectByKey("sk_unknown")).toBeNull()
    })

    it("lists projects by owner and fetches by id", async () => {
      const a = await store.createProject("A", "owner_1")
      const b = await store.createProject("B", "owner_2")
      const ids = (await store.listProjectsByOwner("owner_1")).map((p) => p.id)
      expect(ids).toContain(a.id)
      expect(ids).not.toContain(b.id)
      expect((await store.getProject(a.id))?.name).toBe("A")
      expect(await store.getProject("nope")).toBeNull()
    })

    it("toggles secure metering per project", async () => {
      const p = await store.createProject("Acme", "owner_1")
      expect((await store.getProject(p.id))?.secureMetering).toBe(false)
      await store.setSecureMetering(p.id, true)
      expect((await store.getProject(p.id))?.secureMetering).toBe(true)
    })

    it("scopes accounts by project and lists them", async () => {
      const p = await store.createProject("Acme", "owner_1")
      const u = uid()
      await store.get(scopedId(p.id, u))
      const listed = await store.list(p.id)
      expect(listed.map((a) => a.userId)).toContain(scopedId(p.id, u))
      const other = await store.list("some-other-project")
      expect(other.map((a) => a.userId)).not.toContain(scopedId(p.id, u))
    })

    it("records usage events and aggregates analytics", async () => {
      const p = await store.createProject("Acme", "owner_1")
      const u = scopedId(p.id, uid())
      const base = new Date()
      const at = (h: number) => new Date(base.getTime() + h).toISOString()
      await store.recordEvent({ userId: u, kind: "meter", name: "image_gen", amount: -1, at: at(1000) })
      await store.recordEvent({ userId: u, kind: "meter", name: "image_gen", amount: -1, at: at(2000) })
      await store.recordEvent({ userId: u, kind: "meter", name: "chat", amount: -1, at: at(3000) })
      await store.recordEvent({ userId: u, kind: "grant", name: "credits", amount: 100, at: at(4000) })

      const a = await store.analytics(p.id)
      expect(a.meteredThisMonth).toBe(3)
      expect(a.creditsSoldThisMonth).toBe(100)
      expect(a.topEvents[0]).toEqual({ name: "image_gen", count: 2 })
      expect(a.series).toHaveLength(14)
      expect(a.recent[0].name).toBe("credits")
    })
  })
}
