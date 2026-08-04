import { describe, it, expect, vi, beforeEach } from "vitest"

const core = vi.hoisted(() => ({ listAccounts: vi.fn() }))
const api = vi.hoisted(() => ({ resolveProject: vi.fn() }))
vi.mock("@/lib/paykit-core", () => core)
vi.mock("@/lib/api", () => api)

import { GET } from "@/app/api/v1/accounts/route"

const get = (key?: string) =>
  new Request(`http://localhost/api/v1/accounts${key ? `?key=${key}` : ""}`)

describe("GET /api/v1/accounts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects an invalid API key", async () => {
    api.resolveProject.mockResolvedValue(null)
    expect((await GET(get("bad"))).status).toBe(401)
  })

  it("unscopes the userId and sums the stats", async () => {
    api.resolveProject.mockResolvedValue("proj_x")
    core.listAccounts.mockResolvedValue([
      { userId: "proj_x:alice", plan: "pro", credits: 10, entitlements: ["pro"] },
      { userId: "proj_x:bob", plan: "free", credits: 5, entitlements: [] },
      { userId: "proj_x:carol", plan: "pro", credits: 0, entitlements: ["pro"] },
    ])
    const body = await (await GET(get("pk_x"))).json()
    expect(body.accounts.map((a: { userId: string }) => a.userId)).toEqual(["alice", "bob", "carol"])
    expect(body.stats).toEqual({ total: 3, pro: 2, free: 1, creditsOutstanding: 15, mrr: 38 })
    expect(core.listAccounts).toHaveBeenCalledWith("proj_x")
  })

  it("returns zeroed stats for an empty project", async () => {
    api.resolveProject.mockResolvedValue("proj_x")
    core.listAccounts.mockResolvedValue([])
    const body = await (await GET(get("pk_x"))).json()
    expect(body.accounts).toEqual([])
    expect(body.stats).toEqual({ total: 0, pro: 0, free: 0, creditsOutstanding: 0, mrr: 0 })
  })
})
