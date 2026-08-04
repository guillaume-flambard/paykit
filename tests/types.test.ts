import { describe, it, expect } from "vitest"
import { scopedId, splitId, DEFAULT_PROJECT_ID } from "@/lib/types"

describe("scopedId / splitId", () => {
  it("namespaces a user id with the project id", () => {
    expect(scopedId("proj_x", "user_1")).toBe("proj_x:user_1")
  })

  it("splits a scoped id back into project + user", () => {
    expect(splitId("proj_x:user_1")).toEqual({ projectId: "proj_x", userId: "user_1" })
  })

  it("treats an unscoped id as the default project", () => {
    expect(splitId("user_1")).toEqual({ projectId: DEFAULT_PROJECT_ID, userId: "user_1" })
  })

  it("round-trips project + user", () => {
    const scoped = scopedId("proj_x", "user_1")
    expect(splitId(scoped)).toEqual({ projectId: "proj_x", userId: "user_1" })
  })
})
