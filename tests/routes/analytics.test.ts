import { describe, it, expect, vi, beforeEach } from "vitest"

const core = vi.hoisted(() => ({ analytics: vi.fn(), listAccounts: vi.fn() }))
const api = vi.hoisted(() => ({ resolveProject: vi.fn() }))
vi.mock("@/lib/paykit-core", () => core)
vi.mock("@/lib/api", () => api)

import { GET } from "@/app/api/v1/analytics/route"

const get = (key?: string) =>
  new Request(`http://localhost/api/v1/analytics${key ? `?key=${key}` : ""}`)

const ANALYTICS = {
  meteredThisMonth: 42,
  creditsSoldThisMonth: 100,
  topEvents: [{ name: "chat", count: 42 }],
  series: [{ label: "2026-08-04", metered: 42, granted: 100 }],
  recent: [{ userId: "proj_x:alice", kind: "meter", name: "chat", amount: -1, at: "2026-08-04T00:00:00Z" }],
}

describe("GET /api/v1/analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects an invalid API key", async () => {
    api.resolveProject.mockResolvedValue(null)
    expect((await GET(get("bad"))).status).toBe(401)
  })

  it("keeps the analytics payload and appends account stats", async () => {
    api.resolveProject.mockResolvedValue("proj_x")
    core.analytics.mockResolvedValue(ANALYTICS)
    core.listAccounts.mockResolvedValue([
      { userId: "proj_x:alice", plan: "pro", credits: 10, entitlements: ["pro"] },
      { userId: "proj_x:bob", plan: "free", credits: 5, entitlements: [] },
    ])
    const body = await (await GET(get("pk_x"))).json()
    expect(body.meteredThisMonth).toBe(42)
    expect(body.topEvents).toEqual(ANALYTICS.topEvents)
    expect(body.series).toEqual(ANALYTICS.series)
    expect(body.stats).toEqual({ total: 2, pro: 1, mrr: 19, creditsOutstanding: 15 })
  })

  it("unscopes the userId on recent events", async () => {
    api.resolveProject.mockResolvedValue("proj_x")
    core.analytics.mockResolvedValue(ANALYTICS)
    core.listAccounts.mockResolvedValue([])
    const body = await (await GET(get("pk_x"))).json()
    expect(body.recent[0].userId).toBe("alice")
    expect(body.recent[0].amount).toBe(-1)
  })
})
