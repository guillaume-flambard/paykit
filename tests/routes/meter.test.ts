import { describe, it, expect, vi, beforeEach } from "vitest"

const core = vi.hoisted(() => ({ meter: vi.fn(), getProject: vi.fn() }))
const api = vi.hoisted(() => ({ scope: vi.fn() }))
vi.mock("@/lib/paykit-core", () => core)
vi.mock("@/lib/api", () => api)

import { POST } from "@/app/api/v1/meter/route"
import { DEFAULT_PROJECT_ID } from "@/lib/types"

const post = (body: unknown) =>
  new Request("http://localhost/api/v1/meter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

describe("POST /api/v1/meter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects a missing userId or event", async () => {
    expect((await POST(post({ userId: "u" }))).status).toBe(400)
    expect((await POST(post({ event: "image_gen" }))).status).toBe(400)
  })

  it("rejects an empty or overlong event", async () => {
    expect((await POST(post({ userId: "u", event: "" }))).status).toBe(400)
    expect((await POST(post({ userId: "u", event: "x".repeat(65) }))).status).toBe(400)
  })

  it("rejects a non-positive, non-integer or oversized cost without calling meter", async () => {
    api.scope.mockResolvedValue({ uid: "proj_x:u", projectId: DEFAULT_PROJECT_ID, secret: true })
    for (const cost of [0, -5, 1.5, 1_000_001, "3"]) {
      const res = await POST(post({ userId: "u", event: "image_gen", cost }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/positive integer/)
    }
    expect(core.meter).not.toHaveBeenCalled()
  })

  it("accepts an omitted cost (defaults to 1)", async () => {
    api.scope.mockResolvedValue({ uid: "proj_x:u", projectId: DEFAULT_PROJECT_ID, secret: true })
    core.meter.mockResolvedValue({ ok: true, remaining: 9 })
    const res = await POST(post({ userId: "u", event: "image_gen" }))
    expect(res.status).toBe(200)
    expect(core.meter).toHaveBeenCalledWith("proj_x:u", "image_gen", 1)
  })

  it("rejects an invalid API key", async () => {
    api.scope.mockResolvedValue({ uid: null })
    expect((await POST(post({ userId: "u", event: "image_gen" }))).status).toBe(401)
  })

  it("returns 403 when a secure project is metered without the secret key", async () => {
    api.scope.mockResolvedValue({ uid: "proj_x:u", projectId: "proj_x", secret: false })
    core.getProject.mockResolvedValue({ secureMetering: true })
    const res = await POST(post({ userId: "u", event: "image_gen" }))
    expect(res.status).toBe(403)
    expect(core.getProject).toHaveBeenCalledWith("proj_x")
  })

  it("returns 402 when credits run out", async () => {
    api.scope.mockResolvedValue({ uid: `${DEFAULT_PROJECT_ID}:u`, projectId: DEFAULT_PROJECT_ID, secret: false })
    core.meter.mockResolvedValue({ ok: false, blocked: true, remaining: 0 })
    const res = await POST(post({ userId: "u", event: "image_gen" }))
    expect(res.status).toBe(402)
    const body = await res.json()
    expect(body.blocked).toBe(true)
  })

  it("meters with a custom cost and returns the balance", async () => {
    api.scope.mockResolvedValue({ uid: "proj_x:u", projectId: "proj_x", secret: true })
    core.meter.mockResolvedValue({ ok: true, remaining: 4 })
    const res = await POST(post({ userId: "u", event: "hd_upscale", cost: 4 }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, remaining: 4 })
    expect(core.meter).toHaveBeenCalledWith("proj_x:u", "hd_upscale", 4)
  })
})
