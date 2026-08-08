# SPEC — paykit: cost-vs-revenue guardrail

- **Status**: done · **Bet**: PayKit-core · **Appetite**: 2026-08-08
- **Problem**: la promesse « never lose money on model costs » n'est pas chiffrée — `meter()` ne tracke pas le coût modèle (USD), donc on ne sait pas si la revenue couvre les coûts d'inférence.

## Acceptance criteria (Given-When-Then)
- [ ] **Given** un `meter(userId, event, cost, costUsd)` **When** `costUsd` est fourni **Then** l'événement enregistre le coût modèle USD.
- [ ] **Given** un `meter` **When** `costUsd` est invalide (négatif, non-nombre, > 1e6) **Then** 400 (route) / refus (core).
- [ ] **Given** des meter events avec `costUsd` **When** `GET /api/v1/analytics` **Then** retourne `costUsd` (Σ coûts), `revenueUsd` (crédits vendus × prix unitaire), `netUsd`, `marginPct`.
- [ ] **Given** le store postgres **When** migration **Then** colonne `cost_usd` ajoutée idempotente.
- [ ] **Given** un `meter` sans `costUsd` **Then** comportement inchangé (rétro-compat), coût = 0.

## Goals / constraints
- Aucune nouvelle dépendance. Revenue = `creditsSoldThisMonth × CREDIT_PRICE_USD` (0.09 $/crédit). costUsd borné (≥ 0, ≤ 1e6).
- Memory + Postgres stores. Tests : core + analytics route.

## Rationale history
- 2026-08-08 — roadmap #3, après le jalon npm (#2). La garde free-ride (cycle 4) empêche la perte de crédits ; ici on mesure le coût modèle vs revenue.
