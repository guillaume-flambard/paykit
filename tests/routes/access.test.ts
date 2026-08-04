import { describe, it, expect, vi, beforeEach } from "vitest"

const core = vi.hoisted(() => ({ getAccount: vi.fn() }))
const api = vi.hoisted(() => ({ scope: vi.fn() }))
vi.mock("@/lib/paykit-core", () => core)
vi.mock("@/lib/api", () => api)

import { GET } from "@/app/api/v1/access/route"

describe("GET /api/v1/access", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects a missing userId", async () => {
    const res = await GET(new Request("http://localhost/api/v1/access"))
    expect(res.status).toBe(400)
  })

  it("rejects an invalid API key", async () => {
    api.scope.mockResolvedValue({ uid: null })
    const res = await GET(new Request("http://localhost/api/v1/access?userId=user_1"))
    expect(res.status).toBe(401)
  })

  it("returns the account scoped to the caller's project", async () => {
    api.scope.mockResolvedValue({ uid: "proj_x:user_1" })
    core.getAccount.mockResolvedValue({ userId: "proj_x:user_1", plan: "pro", credits: 10, entitlements: ["pro"] })
    const res = await GET(new Request("http://localhost/api/v1/access?userId=user_1"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.userId).toBe("user_1")
    expect(body.plan).toBe("pro")
    expect(core.getAccount).toHaveBeenCalledWith("proj_x:user_1")
  })
})
