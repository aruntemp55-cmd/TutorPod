# Sprint 2 — Catalog & Home E2E (Maestro)

Maestro is **not** assumed installed in CI. Flows live under [`.maestro/`](../../.maestro/).

## Prerequisites
1. API: `npm run api` (migrated + seeded)
2. Mobile: `npm run mobile` on simulator/emulator (`com.seyon.tutorpod`)
3. Maestro CLI: https://maestro.mobile.dev

## Flows
| File | Covers |
|---|---|
| `.maestro/catalog_home_browse.yaml` | T022 — Guest sees Standard/Section/Chapter + Start podcast |
| `.maestro/catalog_soft_prompt_gate.yaml` | T024 — Start/Learning Path soft-prompt; no Player |
| `.maestro/catalog_tabs.yaml` | T023 — Home / MyPods / Account tabs |
| `.maestro/auth_soft_prompt_resume.yaml` | Related T014 resume (Sprint 1) |

```bash
cd /Users/anambuk/Documents/SeyonGitHub/TutorPod
maestro test .maestro/catalog_home_browse.yaml
maestro test .maestro/catalog_soft_prompt_gate.yaml
maestro test .maestro/catalog_tabs.yaml
```

## Automated tests without Maestro
```bash
npm run api:test       # T020 seed + T021 catalog public/401
npm run mobile:test    # T022 pills, T023 tabs, T024 requireAuthForAction
npm run mobile:lint
```
