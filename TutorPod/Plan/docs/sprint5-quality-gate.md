# Sprint 5 — Quality gate

## Headless CI (runs without Maestro)
```bash
npm run ci
# equivalent:
npm run api:test && npm run mobile:lint && npm run mobile:test
```

GitHub Actions: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — Postgres service, migrate+seed, then `npm run ci`.

## Domain unit suite (T050)
- API: `apps/api/src/domain/podLimits.ts` + `tests/domain-podLimits.test.ts`
- Mobile: `apps/mobile/src/domain/podLimits.ts` + `podLimits.test.ts`
- Limits: hosts **2–4**, context **≤2000**, question **1–1000**

## Integration API (T051)
Covered by `apps/api/tests/auth-catalog-pods.test.ts` + `qa.test.ts` (auth, catalog, pods, stream, Q&A, learning paths).

## E2E / Maestro (T052)
Maestro is **optional** in CI (not installed in most runners). Flows live under [`.maestro/`](../../.maestro/).

Critical journey (Login → Start → Player → Raise hand):
```bash
maestro test .maestro/critical_journey.yaml
# or directly:
maestro test .maestro/sprint4_raise_hand.yaml
```

Aggregated runbooks:
- [`sprint1-auth-e2e.md`](sprint1-auth-e2e.md)
- [`sprint2-catalog-e2e.md`](sprint2-catalog-e2e.md)
- [`sprint3-pods-e2e.md`](sprint3-pods-e2e.md)
- [`sprint4-raise-path-e2e.md`](sprint4-raise-path-e2e.md)

## Accessibility (T053)
Checklist: [`accessibility-checklist.md`](accessibility-checklist.md).

## Traceability (T054)
[`../TRACEABILITY.md`](../TRACEABILITY.md) — P0 rows link code + tests.
