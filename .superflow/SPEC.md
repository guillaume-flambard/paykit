# SPEC — core-audit: core-audit

> 10-30 lines max. Over 50 = over-specifying. The spec is a **candidate**, not a king:
> if evidence (tests green + runtime + design-fidelity) contradicts it, it gets updated
> with a rationale entry below. See `Evidence wins - contract arbitration`.

- **Status**: draft | active | done
- **Bet**: PayKit-core — **Appetite**: 2026-08-08 (circuit breaker: pivot, don't extend)
- **Baseline**: what users do today without this feature (evidence).

## Problem
One line, with evidence (user signal, metric, request).

## Scope
Who it's for, what it does, what it deliberately does NOT do.

## Acceptance criteria (Given-When-Then)
- [ ] **Given** {{context}} **When** {{action}} **Then** {{observable result}}
- [ ] **Given** ... (cover error, empty, loading states too)

## Goals / constraints
- Performance budget (e.g. LCP < 2.5s), a11y (WCAG 2.1 AA), security requirements.
- Hard constraints (no new deps, do not change public API, etc.).

## Rationale history (evidence-wins log)
- 2026-08-08 — {{what changed and why the evidence demanded it}}
