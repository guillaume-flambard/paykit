import { MemoryStore } from "@/lib/store-memory"
import { runStoreContract } from "./store-contract"

runStoreContract(() => new MemoryStore())
