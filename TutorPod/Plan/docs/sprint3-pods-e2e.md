# Sprint 3 — Pods / Player E2E (Maestro)

Maestro is **not** assumed installed in CI. Flows: [`.maestro/`](../../.maestro/).

## Prerequisites
1. `npm run api` (Postgres migrated + seeded); stub generate delay via `POD_GENERATE_DELAY_MS` (default ~350ms)
2. `npm run mobile` on simulator (`com.seyon.tutorpod`)
3. Maestro CLI: https://maestro.mobile.dev

## Flows
| File | Covers |
|---|---|
| `.maestro/pods_start_player.yaml` | T031–T034 — OTP → Start → Generating → Player |
| `.maestro/pods_mypods.yaml` | T033 — Guest MyPods sign-in CTA |
| `.maestro/auth_soft_prompt_resume.yaml` | Related soft-prompt → Start (Sprint 1) |

```bash
cd /Users/anambuk/Documents/SeyonGitHub/TutorPod
maestro test .maestro/pods_start_player.yaml
maestro test .maestro/pods_mypods.yaml
```

## Automated tests without Maestro
```bash
npm run api:test      # T030–T036 generating poll, progress/reaction, guest 401
npm run mobile:test   # includes T034 playerControlsReducer
npm run mobile:lint
```

OTP stub: **`000000`**.
