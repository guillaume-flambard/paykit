# Contract — `.superflow/`

Single source of truth for a feature. All phases read from here; the loop versioned it.

| File | Role |
|---|---|
| `SPEC.md` | 10-30 line contract: problem, acceptance (Given-When-Then), constraints, rationale log. |
| `DESIGN.md` | Screen inventory, states, component hierarchy, fidelity baselines. |
| `tokens.json` | W3C design tokens — the **machine-enforced** visual contract. |
| `tasks.md` | 15-45 min tasks, no overlapping files, each independently testable. |
| `screens/` | Design-fidelity baselines (Stitch exports) — the diff target, NOT the app's history. |
| `kb.md` | Knowledge base of fixes: error signature → procedure. Self-healing. |
| `run-log.md` | Every loop run: gates, explain-back scores, DORA metrics, evals. |

## Rules
1. Version the contract; `SPEC.md`'s Rationale history records every change (evidence-wins).
2. `tokens.json` constrains code — generated code never invents values.
3. The acceptance Given-When-Then scenarios are the single source for: XState model,
   Playwright journeys, and the design-fidelity checks. Three artifacts, zero drift.
4. Gates are deterministic. An LLM proposes; the check disposes.
5. Appetite expires → pivot (`stasis focus review --verdict pivot`), don't extend.

## When the loop detects a drift
- Tests red / fidelity red → fix code, then log the fix procedure in `kb.md`.
- Tests green + runtime contradict the spec → the **evidence wins**: update `SPEC.md`
  with a rationale entry and emit a Vault note if it's a durable lesson.
