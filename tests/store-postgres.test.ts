import { describe, it, expect } from "vitest"
import { PostgresStore } from "@/lib/store-postgres"
import { runStoreContract } from "./store-contract"

const url = process.env.TEST_DATABASE_URL
const skip = !url

describe.skipIf(skip)("PostgresStore", () => {
  runStoreContract(() => new PostgresStore(url!))

  it("boots the schema migrations idempotently", async () => {
    const s1 = new PostgresStore(url!)
    const s2 = new PostgresStore(url!)
    await (s1 as unknown as { ready: Promise<void> }).ready
    await (s2 as unknown as { ready: Promise<void> }).ready
  })
})
