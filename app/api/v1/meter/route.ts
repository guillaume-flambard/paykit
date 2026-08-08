import { NextResponse } from "next/server"
import { meter, getProject } from "@/lib/paykit-core"
import { scope } from "@/lib/api"
import { DEFAULT_PROJECT_ID } from "@/lib/types"

// POST /api/v1/meter  { userId, event, cost?, key? }
// Call this from YOUR backend before/after an AI call — never trust the client.
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, event, cost } = body
    if (typeof userId !== "string" || typeof event !== "string" || event.trim() === "" || event.length > 64) {
      return NextResponse.json({ error: "userId and event are required" }, { status: 400 })
    }
    const costNum = cost === undefined ? 1 : cost
    if (typeof costNum !== "number" || !Number.isInteger(costNum) || costNum < 1 || costNum > 1_000_000) {
      return NextResponse.json({ error: "cost must be a positive integer ≤ 1000000" }, { status: 400 })
    }
    const { uid, projectId, secret } = await scope(req, userId, body)
    if (!uid) return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
    // Secure-metering projects require the secret key (server-side, authoritative).
    if (!secret && projectId !== DEFAULT_PROJECT_ID) {
      const p = await getProject(projectId!)
      if (p?.secureMetering) {
        return NextResponse.json({ error: "This project requires the secret key to meter (server-side)" }, { status: 403 })
      }
    }
    const result = await meter(uid, event, costNum)
    if (result.blocked) {
      return NextResponse.json({ ...result, error: "Insufficient credits" }, { status: 402 })
    }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }
}
