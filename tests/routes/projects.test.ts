import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const clerk = vi.hoisted(() => ({ auth: vi.fn() }))
const core = vi.hoisted(() => ({
  createProject: vi.fn(),
  listProjectsByOwner: vi.fn(),
  setProjectSecureMetering: vi.fn(),
}))
const api = vi.hoisted(() => ({ keyFromRequest: vi.fn() }))
vi.hoisted(() => {
  process.env.CLERK_SECRET_KEY = "test_sk" // forces clerkConfigured=true at import time
})
vi.mock("@clerk/nextjs/server", () => ({ auth: clerk.auth }))
vi.mock("@/lib/paykit-core", () => core)
vi.mock("@/lib/api", () => api)

import { GET, POST, PATCH } from "@/app/api/v1/projects/route"

const post = (body: unknown) =>
  new Request("http://localhost/api/v1/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

describe("projects route (multi-tenant)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    delete process.env.CLERK_SECRET_KEY
  })

  it("lists the signed-in owner's projects", async () => {
    clerk.auth.mockResolvedValue({ userId: "user_1" })
    core.listProjectsByOwner.mockResolvedValue([{ id: "proj_x", name: "Acme" }])
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.projects[0].id).toBe("proj_x")
    expect(body.authConfigured).toBe(true)
    expect(core.listProjectsByOwner).toHaveBeenCalledWith("user_1")
  })

  it("returns 401 when not signed in", async () => {
    clerk.auth.mockResolvedValue({ userId: null })
    expect((await GET()).status).toBe(401)
    expect((await POST(post({ name: "Acme" }))).status).toBe(401)
  })

  it("creates a project for the signed-in owner", async () => {
    clerk.auth.mockResolvedValue({ userId: "user_1" })
    core.createProject.mockResolvedValue({ id: "proj_x", name: "Acme" })
    const res = await POST(post({ name: "Acme" }))
    expect(res.status).toBe(200)
    expect(core.createProject).toHaveBeenCalledWith("Acme", "user_1")
  })

  it("defaults to 'Untitled project' when no name is given", async () => {
    clerk.auth.mockResolvedValue({ userId: "user_1" })
    core.createProject.mockResolvedValue({ id: "proj_x" })
    await POST(post({}))
    expect(core.createProject).toHaveBeenCalledWith("Untitled project", "user_1")
  })

  it("rejects a name over 100 characters", async () => {
    clerk.auth.mockResolvedValue({ userId: "user_1" })
    expect((await POST(post({ name: "x".repeat(101) }))).status).toBe(400)
    expect(core.createProject).not.toHaveBeenCalled()
  })

  it("requires a secret key to toggle secure metering", async () => {
    api.keyFromRequest.mockReturnValue(null)
    expect((await PATCH(post({ secureMetering: true }))).status).toBe(401)
    api.keyFromRequest.mockReturnValue("pk_live_public")
    expect((await PATCH(post({ secureMetering: true }))).status).toBe(401)
  })

  it("validates the secureMetering field", async () => {
    api.keyFromRequest.mockReturnValue("sk_live_x")
    expect((await PATCH(post({ secureMetering: "yes" }))).status).toBe(400)
  })

  it("rejects an invalid secret key", async () => {
    api.keyFromRequest.mockReturnValue("sk_live_x")
    core.setProjectSecureMetering.mockResolvedValue(null)
    expect((await PATCH(post({ secureMetering: true }))).status).toBe(401)
  })

  it("toggles secure metering with a valid secret key", async () => {
    api.keyFromRequest.mockReturnValue("sk_live_x")
    core.setProjectSecureMetering.mockResolvedValue({ id: "proj_x", secureMetering: true })
    const res = await PATCH(post({ secureMetering: true }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: "proj_x", secureMetering: true })
    expect(core.setProjectSecureMetering).toHaveBeenCalledWith("sk_live_x", true)
  })
})
