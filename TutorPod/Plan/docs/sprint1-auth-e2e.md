# Sprint 1 — Auth E2E (Maestro)

Maestro is **not** run in GitHub CI. Flows live under [`.maestro/`](../../.maestro/).

## Prerequisites
1. API: `npm run api` (Postgres migrated + seeded)
2. Mobile: `npm run mobile` (`com.seyon.tutorpod`)
3. Maestro CLI: https://maestro.mobile.dev

## Flows
| File | Covers |
|---|---|
| `.maestro/auth_login.yaml` | Login (email + OTP `000000`) → Settings gate if needed → Main → **Log out** → Login |
| `.maestro/auth_soft_prompt_resume.yaml` | Login-first Start podcast (guest soft-prompt retired) |

```bash
cd /Users/anambuk/Documents/SeyonGitHub/TutorPodRepo/TutorPod
maestro test .maestro/auth_login.yaml
```

Dev OTP stub: **`000000`** (non-production only).
