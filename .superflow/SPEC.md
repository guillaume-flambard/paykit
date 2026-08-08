# SPEC — paykit: cost guardrail sur `/api/v1/meter`

- **Status**: done · **Bet**: PayKit-core · **Appetite**: 2026-08-08
- **Problem**: `cost` n'est pas validé → meter à coût **0** (free-ride), **négatif** (= crédits CRÉDITÉS, bug sérieux), fractionnaire ou démesuré ; `event` vide passe. C'est la promesse « never lose money on model costs » non garantie à la frontière API.

## Acceptance criteria (Given-When-Then)
- [ ] **Given** un `POST /api/v1/meter` **When** `cost` est 0, négatif, non-entier, ou > 1_000_000 **Then** `400 { error: "cost must be a positive integer ≤ 1000000" }` et **aucune déduction**.
- [ ] **Given** un appel **When** `cost` est omis **Then** coût par défaut = 1 (rétro-compatible).
- [ ] **Given** un appel **When** `event` est vide ou > 64 caractères **Then** `400`.
- [ ] **Given** un coût valide **When** déduction **Then** résultat inchangé (`ok`/`remaining`/`blocked`).
- [ ] **Given** un `meter()` direct au core **When** `cost` est non valide **Then** il refuse (défense en profondeur — jamais de crédit négatif).

## Goals / constraints
- Rétro-compat : `cost` omis = 1. Validation à la **route** (message 400 clair) ET au **core** `meter()` (garde anti-crédit-négatif).
- Aucune nouvelle dépendance. Tests : `tests/routes/meter.test.ts` + `tests/paykit-core.test.ts`.

## Rationale history
- 2026-08-08 — trouvé par le sweep characterization (routes sondées) : `typeof cost === "number" ? cost : 1` sans borne. Un `cost: -5` crédite 5 crédits — bug de perte d'argent.
