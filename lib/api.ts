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

/** Resolve the project from the request key and return the namespaced account id. */
export async function scope(req: Request, clientUserId: string, body?: Record<string, unknown>) {
  const projectId = await projectFromKey(keyFromRequest(req, body))
  return { projectId, uid: scopedId(projectId, clientUserId) }
}
