# Tasks — core-audit: core-audit

> One task = 15-45 min. No two tasks edit the same file (merge-conflict rule).
> Each task is independently testable (`Verify:` runs alone). Dependencies explicit.

| # | Task | File(s) | Depends on | Verify (test command) | Acceptance |
|---|---|---|---|---|---|
| 1 | Scaffold contract + tokens → Tailwind config | `tailwind.config.*`, `.superflow/` | — | `npx tailwindcss --version` | tokens map 1:1 |
| 2 | XState model of the flow | `src/machines/core-audit.ts` | 1 | `npm run test -- machines` | states/events match SPEC |
| 3 | ... | | | | |

## Definition of Done (every task)
- [ ] Unit/integration green (`Verify:`)
- [ ] Explain-back: module explainable in plain words (score in run-log.md)
- [ ] No new AppSec findings (SAST/secrets/deps)
- [ ] Design-fidelity diff passes (if UI)
