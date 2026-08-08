# Knowledge base — error signature → fix procedure
| Error signature | Fix procedure | First seen | Times applied |
|---|---|---|---|
| `cost` négatif/zéro/fractionnaire sur un endpoint billing (meter) | Valider à la frontière : `Number.isInteger(cost) && cost >= 1 && cost <= 1e6` → 400. **Un coût négatif CRÉDITE l'utilisateur** (perte d'argent) — jamais de déduction non bornée. Garde au core (défense en profondeur) + message 400 à la route. | 2026-08-08 paykit | 1 |
| `amount` négatif/zéro sur un endpoint de grant (credits) | Même garde que meter : `Number.isInteger && >= 1 && <= 1e6` → 400. **Un grant négatif VOLE les crédits.** | 2026-08-08 paykit | 1 |
| `plan` inconnu sur setPlan | Whitelist `PLAN_ENTITLEMENTS` (free/pro) → 400 "unknown plan" ; ne jamais laisser un plan arbitraire avec 0 entitlements. | 2026-08-08 paykit | 1 |
| `kind` hors whitelist sur un checkout | Brancher explicitement (`kind === "pro" ? ... : credits`) peut charger SILENCIEUSEMENT par défaut sur une typo → valider `kind ∈ {credits, pro}` → 400 avant Stripe. | 2026-08-08 paykit | 1 |
| `name` non borné sur création (projects) | Borner (≤ 100) → 400. Même règle que les quantités : toute entrée client a une borne. | 2026-08-08 paykit | 1 |
| Aucune visibilité runtime (la boucle s'arrête aux tests verts) | Telemetry légère : `sendBeacon` client (window error + unhandledrejection, throttle 1/s) → `POST /api/v1/telemetry` → ring buffer + `.superflow/runtime-errors.md` (gitignoré). Le superflow relit ce log en feedback Phase 5 → 4/6. Sans Sentry : zéro compte, zéro secret, best-effort. | 2026-08-08 paykit | 1 |
