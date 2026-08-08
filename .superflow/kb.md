# Knowledge base — error signature → fix procedure
| Error signature | Fix procedure | First seen | Times applied |
|---|---|---|---|
| `cost` négatif/zéro/fractionnaire sur un endpoint billing (meter) | Valider à la frontière : `Number.isInteger(cost) && cost >= 1 && cost <= 1e6` → 400. **Un coût négatif CRÉDITE l'utilisateur** (perte d'argent) — jamais de déduction non bornée. Garde au core (défense en profondeur) + message 400 à la route. | 2026-08-08 paykit | 1 |
| `amount` négatif/zéro sur un endpoint de grant (credits) | Même garde que meter : `Number.isInteger && >= 1 && <= 1e6` → 400. **Un grant négatif VOLE les crédits.** | 2026-08-08 paykit | 1 |
| `plan` inconnu sur setPlan | Whitelist `PLAN_ENTITLEMENTS` (free/pro) → 400 "unknown plan" ; ne jamais laisser un plan arbitraire avec 0 entitlements. | 2026-08-08 paykit | 1 |
