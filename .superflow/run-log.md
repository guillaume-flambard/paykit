# Run log — paykit (superflow T1, 2026-08-08)

| check | result |
|---|---|
| stack | Next.js 15.5.19 + React 19 + Stripe + Postgres |
| gates | tsc:<ok> · tests:<76/76 (13 files)> · audit:<3 high — P1> |
| web | boot:ok (:3010) · routes walked:5 (/, /demo, /docs, /account, /embed-demo.html) · console errors:0 · a11y: **0 viol (3 viewports, après fix)** |
| verdict | green (a11y) — P1 audit ouvert |

## Fix a11y appliqué (procédure kb `Dark landing a11y`)
- Muted grays trop sombres sur fond dark → `#9a9aa2` : `#6b7280`, `#76767e`, `#6b6b73` (badge PREVIEW `#7c7c85` → `#a5a5ad`), puis `#52525b`, `#565a66`, `#5b5b63`, `#6f6f77`. Fond sombres (lum <0.3) inchangés.
- `<pre>` scrollables (`overflow-x:auto`) → `tabIndex={0}` (page.tsx ×2, docs, account).
- Re-scan axe 375/768/1280 : **0 violation**. tsc + tests 76/76 toujours verts.

## P1 — audit (décision requise)
3 high, fix = **major bump next 15 → 16.3.0** :
- `next@15.5.19` — GHSA-955p-x3mx-jcvp (Unauthenticated disclosure of internal Server Function endpoints)
- `postcss ≤8.5.22` (bundlé next) — GHSA-qx2v-qp2m-jg93 (XSS via `</style>`)
- `sharp 0.34.5 <0.35.0` (via next) — GHSA-f88m-g3jw-g9cj (libvips CVEs ×4)

→ Pas de bump auto : major breaking sur le repo du bet = décision humaine. `npm audit fix --force` installerait next@16.3.0.

## État
Fix a11y commité (T1). P1 audit laissé en décision — la migration next 16 doit être planifiée (tests de non-régression, embarquement).

## Run 2026-08-08 (2) — P1 audit résolu (next 15→16)
- **Upgrade `next@15.5.23 → 16.3.0`** (major) : tsc clean · `npm run build` OK (toutes routes + middleware Proxy) · **76/76 tests** · **`npm audit --omit=dev` = 0** (résout GHSA-955p Server Function, postcss XSS, sharp libvips).
- Clerk 7.5.7 compatible next 16 (aucun changement API).
- Smoke runtime : GET `/` 200 · POST `/api/v1/meter` 200 `{ok:true, remaining:4}`.
- ✅ P1 fermé. Gate complet vert.

## Run 2026-08-08 (3) — Cycle 4: feature build complet « cost guardrail »

Feature : validation de `cost`/`event` sur `/api/v1/meter` (le gap free-ride — `cost: -5` CRÉDITAIT 5 crédits).

| Étape du loop | Livré |
|---|---|
| SPEC | `.superflow/SPEC.md` (Given-When-Then, appetite) |
| Code | `lib/paykit-core.ts` garde `Number.isInteger && 1..1e6` ; `route.ts` 400 clair avant scope |
| Tests | +4 (1 core anti-crédit-négatif + 3 route) → **80/80** |
| Gates | tsc ✓ · npm test 80/80 ✓ · build ✓ |
| Runtime | smoke : cost -5/0 → 400, omis → 200, event vide → 400 |
| Connaissance | kb.md (procédure) + note Vault |

Rétro-compat vérifiée (`cost` omis = 1). Aucune nouvelle dépendance.

## Run 2026-08-08 (4) — Cycle 4 suite: même classe de bugs sur /api/v1/credits

- `grantCredits` : garde `positive integer ≤ 1e6` (un `amount: -100` VOLAIT 100 crédits).
- `setPlan` : whitelist `PLAN_ENTITLEMENTS` (free/pro) — un plan inconnu partait avec 0 entitlements.
- Route `/api/v1/credits` : 400 clair (amount + plan) avant scope.
- Tests +4 → **84/84** · tsc ✓ · smoke : -100→400, gold→400, +10→200.
- KB : entrée « grant/plan guard ».

## Run 2026-08-08 (5) — Cycle 4 suite: checkout kind + projects name

- `/api/v1/checkout` : `kind` hors whitelist (typo « Pros », garbage, null) chargeait SILENCIEUSEMENT les credits → 400 explicite (`kind` ∈ {credits, pro}), aucune session Stripe.
- `/api/v1/projects` : `name` non borné → ≤ 100 caractères (400).
- `webhook` : vérifié — signé Stripe, zéro input client. ✓ `access`/`accounts`/`portal` : inputs validés/read-only. ✓
- Tests +2 → **86/86** · tsc ✓.

## Run 2026-08-08 (6) — Cycle 4: Phase 5 post-ship — runtime observability

Ferme la lacune « la boucle s'arrête à tests verts » :
- `POST/GET /api/v1/telemetry` — ring buffer (200) + append `.superflow/runtime-errors.md` (gitignoré, log vivant que le loop relit en feedback).
- `app/telemetry-client.tsx` — capture `window error` + `unhandledrejection`, throttlée 1/s, sendBeacon best-effort, branchée dans le layout.
- Tests +3 → **89/89** · tsc ✓ · smoke : POST 200 → GET recent → runtime-errors.md alimenté.
- `.gitignore` : `runtime-errors.md` (log vivant, pas de commit).
- **DORA** : la boucle lit maintenant les erreurs runtime (Phase 5 → Phase 4/6) — le feedback post-ship re-entre dans le loop.

## Run 2026-08-08 (7) — Cycle autonomie: prép npm publish — BLOCKÉ (nom)

Milestone roadmap #2 (`@paykit/react` + `@paykit/node`). Vérif de nom = **gate d'entrée** :

| check | résultat |
|---|---|
| `@paykit/react` | ⛔ **PRIS** — paykit-tech (widget crypto cross-chain, v0.1.3, maj 2025-12) |
| `@paykit/node` | 404 (mais scope `@paykit` non publiable par nous) |
| `paykit-react` / `paykit-node` / `paykit-js` | ✓ libres |
| `npm whoami` | pas de session (publish impossible en l'état) |

→ Aucun build/dry-run tant que le nom n'est pas tranché (construire sous un nom impubliable = travail jeté).
**ESCLADE** en D-001 (decisions.md). Gates paykit toujours verts (89/89, tsc, build).

## Run 2026-08-08 (7) — SDK npm prêt (D-001 → O1)
- D-001 tranchée : **O1** — `paykit-react` + `paykit-node` (noms libres vérifiés npm).
- `packages/node` (paykit-node 0.1.0) : core + types + stores (memory/postgres), build tsc NodeNext ✓, smoke `meter → remaining 102` ✓, pack = 9 fichiers.
- `packages/react` (paykit-react 0.1.0) : PayKitProvider/usePayKit/Paywall, peer react ≥18, build ✓.
- `npm pack --dry-run` OK des deux. **Publication bloquée : `npm whoami` → E401 (pas de login npm).**
- Actions restantes pour publier : `npm login` puis `npm publish` dans chaque package (prepublishOnly build déjà câblé).

## Run 2026-08-08 (8) — cost-vs-revenue guardrail (roadmap #3)
- `meter(userId, event, cost, costUsd?)` : tracke le coût modèle USD (validé ≥0, ≤1e6) → `UsageEvent.costUsd`.
- `Analytics` + `costUsd`/`revenueUsd` (crédits vendus × CREDIT_PRICE_USD 0.09)/`netUsd`/`marginPct`. Memory + Postgres (`cost_usd` migration idempotente).
- Route meter accepte + valide `costUsd` (400 si invalide).
- Tests +3 → **92/92** · tsc ✓ · smoke : meter costUsd 0.05 → analytics costUsd 0.05, revenue 9.9, net 9.85, margin 99.5%.
- SPEC : done.
