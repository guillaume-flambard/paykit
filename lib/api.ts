// Request → project scoping helpers for the v1 API.
import { projectFromKey } from "./paykit-core"
import { scopedId } from "./types"

/** Pull the API key from the header, JSON body, or query string. */
export function keyFromRequest(req: Request, body?: Record<string, unknown>): string | null {
  const header = req.headers.get("x-paykit-key")
  if (header) return header
  if (body && typeof body.key === "string") return body.key
  return new URL(req.url).searchParams.get("key")
}

/**
 * Resolve the project from the request key and return the namespaced account id.
 * projectId/uid are null when a key was provided but didn't match any project
 * (the caller should respond 401 rather than touching the demo project).
 */
export async function scope(req: Request, clientUserId: string, body?: Record<string, unknown>) {
  const rawKey = keyFromRequest(req, body)
  const projectId = await projectFromKey(rawKey)
  return {
    projectId,
    uid: projectId ? scopedId(projectId, clientUserId) : null,
    secret: !!rawKey && rawKey.startsWith("sk_"), // was a secret key presented?
  }
}

/** Resolve just the project id from the ?key= query param (null = invalid key). */
export async function resolveProject(req: Request): Promise<string | null> {
  return projectFromKey(new URL(req.url).searchParams.get("key"))
}

/**
 * Project id for the read-only admin routes (accounts, analytics). These expose every
 * user id, plan and balance of a project, so a publishable key (shipped to browsers)
 * must not unlock them: only a secret key, or the public demo project, is accepted.
 * No key → demo project, anything else (incl. a real project's pk_) → null (401).
 */
export async function resolveAdminProject(req: Request): Promise<string | null> {
  const key = keyFromRequest(req)
  if (key && !key.startsWith("sk_") && key !== "pk_live_demo") return null
  return projectFromKey(key)
}
