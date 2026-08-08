# DESIGN — core-audit

> The visual contract. `tokens.json` is the **machine-enforced** source of truth;
> this file is the human-readable layer. Every screen's fidelity is judged against
> the Stitch export in `.superflow/screens/` — never against the app's own history.

## Design tokens
Source: `.superflow/tokens.json` (W3C format). Generate Tailwind config + CSS vars from it
(Style Dictionary). Generated code must read tokens — never invent color/spacing/type values.

## Screen inventory
| Screen | Component path | States (loading/error/empty/success) | Design baseline (screens/) | Fidelity gate |
|---|---|---|---|---|
| Dashboard | `src/pages/dashboard.tsx` | loading · error · empty · success | `screens/dashboard.png` | `toHaveScreenshot` |

## Component hierarchy (atoms → molecules → pages)
- Shared atoms: code ONCE, reference everywhere, NEVER regenerate.
- Each screen is composed from these, not re-created.

## Responsive
Breakpoints: `sm` / `md` / `lg` / `xl`. Per-screen mobile/tablet/desktop fidelity baselines.

## Design-system notes (Stitch)
- Design system created/loaded BEFORE screens; screens generated in series with the
  previous screen + the system as context.
