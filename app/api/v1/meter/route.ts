import { NextResponse } from "next/server"
import { meter } from "@/lib/paykit-core"

// POST /api/v1/meter  { userId, event, cost? }
// Call this from YOUR backend before/after an AI call — never trust the client.
export async function POST(req: Request) {
  try {
    const { userId, event, cost } = await req.json()
    if (typeof userId !== "string" || typeof event !== "string") {
      return NextResponse.json({ error: "userId and event are required" }, { status: 400 })
    }
    const result = meter(userId, event, typeof cost === "number" ? cost : 1)
    if (result.blocked) {
      return NextResponse.json({ ...result, error: "Insufficient credits" }, { status: 402 })
    }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }
}
