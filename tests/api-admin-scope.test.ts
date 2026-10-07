import { describe, it, expect, vi, beforeEach } from "vitest"

const core = vi.hoisted(() => ({ projectFromKey: vi.fn() }))
vi.mock("@/lib/paykit-core", () => core)

import { resolveAdminProject } from "@/lib/api"

const req = (key?: string) => new Request(`http://localhost/x${key ? `?key=${key}` : ""}`)

describe("resolveAdminProject (accounts/analytics scoping)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    core.projectFromKey.mockImplementation(async (k: string | null) => (k === "bad" ? null : "proj"))
  })

  it("refuses a real project's publishable key", async () => {
    expect(await resolveAdminProject(req("pk_live_abc"))).toBeNull()
    expect(core.projectFromKey).not.toHaveBeenCalled()
  })

  it("accepts a secret key", async () => {
    expect(await resolveAdminProject(req("sk_live_abc"))).toBe("proj")
    expect(core.projectFromKey).toHaveBeenCalledWith("sk_live_abc")
  })

  it("accepts the public demo key and the no-key demo project", async () => {
    expect(await resolveAdminProject(req("pk_live_demo"))).toBe("proj")
    expect(await resolveAdminProject(req())).toBe("proj")
  })

  it("accepts the secret key from the x-paykit-key header", async () => {
    const r = new Request("http://localhost/x", { headers: { "x-paykit-key": "sk_live_abc" } })
    expect(await resolveAdminProject(r)).toBe("proj")
  })
})
