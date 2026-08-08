import { describe, it, expect } from "vitest"
import { POST, GET } from "@/app/api/v1/telemetry/route"

const post = (body: unknown) =>
  new Request("http://localhost/api/v1/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

describe("POST /api/v1/telemetry (runtime observability)", () => {
  it("stores an error entry and returns it via GET", async () => {
    const msg = "boom " + Math.random()
    expect((await POST(post({ kind: "error", message: msg, url: "http://x/" }))).status).toBe(200)
    const body = await (await GET()).json()
    expect(body.recent.some((e: { message: string }) => e.message === msg)).toBe(true)
  })

  it("rejects an empty message", async () => {
    expect((await POST(post({ message: "" }))).status).toBe(400)
    expect((await POST(post({}))).status).toBe(400)
  })

  it("truncates an oversized message to 500 chars", async () => {
    await POST(post({ message: "x".repeat(5000) }))
    const body = await (await GET()).json()
    expect(body.recent.some((e: { message: string }) => e.message.length === 500)).toBe(true)
  })
})
