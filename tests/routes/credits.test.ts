import { describe, it, expect, vi, beforeEach } from "vitest"

const core = vi.hoisted(() => ({ grantCredits: vi.fn(), setPlan: vi.fn(), getAccount: vi.fn() }))
const api = vi.hoisted(() => ({ scope: vi.fn() }))
vi.mock("@/lib/paykit-core", () => core)
vi.mock("@/lib/api", () => api)

import { POST } from "@/app/api/v1/credits/route"
import { DEFAULT_PROJECT_ID } from "@/lib/types"

const post = (body: unknown) =>
  new Request("http://localhost/api/v1/credits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

describe("POST /api/v1/credits", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects a missing userId", async () => {
    expect((await POST(post({ amount: 100 }))).status).toBe(400)
  })

  it("rejects an invalid API key", async () => {
    api.scope.mockResolvedValue({ uid: null })
    expect((await POST(post({ userId: "u" }))).status).toBe(401)
  })

  it("rejects a non-positive or non-integer amount without granting", async () => {
    api.scope.mockResolvedValue({ uid: "proj_x:u", projectId: DEFAULT_PROJECT_ID, secret: true })
    for (const amount of [-100, 0, 1.5, 1_000_001, "100"]) {
      const res = await POST(post({ userId: "u", amount }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/positive integer/)
    }
    expect(core.grantCredits).not.toHaveBeenCalled()
  })

  it("rejects an unknown plan", async () => {
    api.scope.mockResolvedValue({ uid: "proj_x:u", projectId: DEFAULT_PROJECT_ID, secret: true })
    expect((await POST(post({ userId: "u", plan: "gold" }))).status).toBe(400)
    expect(core.setPlan).not.toHaveBeenCalled()
  })

  it("grants a valid amount", async () => {
    api.scope.mockResolvedValue({ uid: "proj_x:u", projectId: DEFAULT_PROJECT_ID, secret: true })
    core.getAccount.mockResolvedValue({ plan: "free", credits: 105, userId: "proj_x:u" })
    expect((await POST(post({ userId: "u", amount: 100 }))).status).toBe(200)
    expect(core.grantCredits).toHaveBeenCalledWith("proj_x:u", 100)
  })

  it("requires the secret key outside the demo project", async () => {
    api.scope.mockResolvedValue({ uid: "proj_x:u", projectId: "proj_x", secret: false })
    expect((await POST(post({ userId: "u", amount: 100 }))).status).toBe(403)
  })

  it("grants credits and sets the plan", async () => {
    api.scope.mockResolvedValue({ uid: `${DEFAULT_PROJECT_ID}:u`, projectId: DEFAULT_PROJECT_ID, secret: false })
    core.setPlan.mockResolvedValue({})
    core.grantCredits.mockResolvedValue({})
    core.getAccount.mockResolvedValue({ userId: "u", plan: "pro", credits: 103, entitlements: ["pro"] })
    const res = await POST(post({ userId: "u", amount: 100, plan: "pro" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.plan).toBe("pro")
    expect(core.setPlan).toHaveBeenCalledWith(`${DEFAULT_PROJECT_ID}:u`, "pro")
    expect(core.grantCredits).toHaveBeenCalledWith(`${DEFAULT_PROJECT_ID}:u`, 100)
  })
})
