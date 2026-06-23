import { NextResponse } from "next/server"
import { meter } from "@/lib/paykit-core"
import { scope } from "@/lib/api"

// POST /api/v1/meter  { userId, event, cost?, key? }
// Call this from YOUR backend before/after an AI call — never trust the client.
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, event, cost } = body
    if (typeof userId !== "string" || typeof event !== "string") {
      return NextResponse.json({ error: "userId and event are required" }, { status: 400 })
    }
    const { uid } = await scope(req, userId, body)
    const result = await meter(uid, event, typeof cost === "number" ? cost : 1)
    if (result.blocked) {
      return NextResponse.json({ ...result, error: "Insufficient credits" }, { status: 402 })
    }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }
}
