import { NextResponse } from "next/server"
import { createProject } from "@/lib/paykit-core"

// POST /api/v1/projects  { name? }  → { id, name, publishableKey, secretKey }
// Creates a project and returns its keys. The secret key is shown ONCE here.
// MVP: open (no auth) — a real build would gate this behind a logged-in account.
export async function POST(req: Request) {
  let name = "Untitled project"
  try {
    const body = await req.json()
    if (body && typeof body.name === "string" && body.name.trim()) name = body.name.trim()
  } catch {
    /* empty body is fine */
  }
  const project = await createProject(name)
  return NextResponse.json(project)
}
