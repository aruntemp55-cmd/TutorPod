# Sprint 4 — Raise-hand / Learning Path E2E (Maestro)

Maestro is **not** assumed installed in CI. Flows under [`.maestro/`](../../.maestro/).

## Prerequisites
1. `npm run api` (migrated + seeded)
2. `npm run mobile` on simulator (`com.seyon.tutorpod`)
3. Maestro CLI: https://maestro.mobile.dev
4. Optional telemetry: set `EXPO_PUBLIC_SENTRY_DSN` (no-op if unset)

## Flows
| File | Covers |
|---|---|
| `.maestro/sprint4_raise_hand.yaml` | T041 — login → Start → Player → Raise hand → answer → resume |
| `.maestro/sprint4_learning_path_gate.yaml` | T043 — guest Learning Path soft-prompt |
| `.maestro/sprint4_guest_soft_prompt_resume.yaml` | T046 — guest Start → OTP → resume Audio Overview |
| `.maestro/auth_soft_prompt_resume.yaml` | Related Sprint 1 resume |

```bash
cd /Users/anambuk/Documents/SeyonGitHub/TutorPod
maestro test .maestro/sprint4_raise_hand.yaml
maestro test .maestro/sprint4_learning_path_gate.yaml
maestro test .maestro/sprint4_guest_soft_prompt_resume.yaml
```

## Automated tests without Maestro
```bash
npm run api:test       # T040 questions + T042 learning paths (+ qa unit)
npm run mobile:test    # T044 polish, T045 telemetry, connectivity
npm run mobile:lint
```

OTP stub: **`000000`**.
