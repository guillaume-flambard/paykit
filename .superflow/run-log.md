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
