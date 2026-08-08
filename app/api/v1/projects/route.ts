import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createProject, listProjectsByOwner, setProjectSecureMetering } from "@/lib/paykit-core"
import { keyFromRequest } from "@/lib/api"

const clerkConfigured = !!process.env.CLERK_SECRET_KEY

// Owner = the signed-in Clerk user. Without Clerk configured we fall back to a
// shared "demo" owner so the open MVP flow keeps working.
async function owner(): Promise<string | null> {
  if (!clerkConfigured) return "demo"
  const { userId } = await auth()
  return userId || null
}

// GET /api/v1/projects → the signed-in owner's projects (keys included).
export async function GET() {
  const ownerId = await owner()
  if (!ownerId) return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  return NextResponse.json({ projects: await listProjectsByOwner(ownerId), authConfigured: clerkConfigured })
}

// POST /api/v1/projects { name? } → create a project owned by the signed-in user.
export async function POST(req: Request) {
  const ownerId = await owner()
  if (!ownerId) return NextResponse.json({ error: "Sign in to create a project" }, { status: 401 })
  let name = "Untitled project"
  try {
    const body = await req.json()
    if (body && typeof body.name === "string" && body.name.trim()) name = body.name.trim()
  } catch {
    /* empty body is fine */
  }
  if (name.length > 100) {
    return NextResponse.json({ error: "name must be ≤ 100 characters" }, { status: 400 })
  }
  const project = await createProject(name, ownerId)
  return NextResponse.json(project)
}

// PATCH /api/v1/projects { secureMetering, key: sk_... } → toggle a project setting.
// Authorized by the project's own secret key (no Clerk needed for server-side admin).
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}))
  const key = keyFromRequest(req, body)
  if (!key || !key.startsWith("sk_")) {
    return NextResponse.json({ error: "Secret key required" }, { status: 401 })
  }
  if (typeof body.secureMetering !== "boolean") {
    return NextResponse.json({ error: "secureMetering (boolean) is required" }, { status: 400 })
  }
  const project = await setProjectSecureMetering(key, body.secureMetering)
  if (!project) return NextResponse.json({ error: "Invalid secret key" }, { status: 401 })
  return NextResponse.json({ id: project.id, secureMetering: project.secureMetering })
}
