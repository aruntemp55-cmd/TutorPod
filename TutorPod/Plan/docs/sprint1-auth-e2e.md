# Sprint 1 — Auth E2E (Maestro)

Maestro is **not** assumed installed in CI. Flows live under [`.maestro/`](../../.maestro/).

## Prerequisites
1. API: `npm run api` (Postgres migrated + seeded)
2. Mobile: `npm run mobile` then run iOS Simulator / Android emulator with appId `com.seyon.tutorpod`
3. Install Maestro CLI: https://maestro.mobile.dev (`curl -Ls "https://get.maestro.mobile.dev" | bash`)

## Flows
| File | Covers |
|---|---|
| `.maestro/auth_login.yaml` | T011 — Sign in from Account → OTP → Home |
| `.maestro/auth_soft_prompt_resume.yaml` | T014 — Play/Start soft-prompt → OTP → resume Start podcast |

```bash
cd /Users/anambuk/Documents/SeyonGitHub/TutorPod
maestro test .maestro/auth_login.yaml
maestro test .maestro/auth_soft_prompt_resume.yaml
```

## Automated tests that run without Maestro
```bash
npm run api:test           # includes Sprint1 T010/T013 in auth-catalog-pods.test.ts
npm run test:mobile-auth   # pendingAction + onboardingFlag unit (T012/T014)
```

Dev OTP stub: **`000000`**.
