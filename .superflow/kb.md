# Knowledge base — error signature → fix procedure
| Error signature | Fix procedure | First seen | Times applied |
|---|---|---|---|
| `cost` négatif/zéro/fractionnaire sur un endpoint billing (meter) | Valider à la frontière : `Number.isInteger(cost) && cost >= 1 && cost <= 1e6` → 400. **Un coût négatif CRÉDITE l'utilisateur** (perte d'argent) — jamais de déduction non bornée. Garde au core (défense en profondeur) + message 400 à la route. | 2026-08-08 paykit | 1 |
