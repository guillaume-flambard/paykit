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
