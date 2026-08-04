// Fresh in-memory store for every test file that exercises the core engine
// (no DATABASE_URL → paykit-core uses the singleton below).
import { MemoryStore } from "@/lib/store-memory"

;(globalThis as unknown as { __paykitStore?: unknown }).__paykitStore = new MemoryStore()
