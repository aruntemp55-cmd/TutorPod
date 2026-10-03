# Sprint 4 — Raise-hand / Learning Path E2E (Maestro)

Maestro is **not** run in GitHub CI. Flows under [`.maestro/`](../../.maestro/).

Live app: **Login first** (`RootNavigator` `initialRouteName="Login"`). OTP stub **`000000`** (non-production).

## Prerequisites
1. `npm run api` (migrated + seeded)
2. `npm run mobile` on simulator (`com.seyon.tutorpod`)
3. Maestro CLI: https://maestro.mobile.dev

## Shared helper
`.maestro/helpers/login_to_main.yaml` — email + OTP `000000` → Settings (name + Class 11) if needed → Main.

## Flows
| File | Covers |
|---|---|
| `.maestro/sprint4_raise_hand.yaml` | T041 — Login → Main → Chemistry → Start → Player → Raise hand (`ask-text-input` / `ask-send`) |
| `.maestro/critical_journey.yaml` | T052 — runs raise-hand (`npm run maestro:critical`) |
| `.maestro/sprint4_learning_path_gate.yaml` | T043 — Main **Learning Path** tile (not guest Home pill) |
| `.maestro/sprint4_guest_soft_prompt_resume.yaml` | Retired guest resume; now login-first Start podcast |
| `.maestro/auth_login.yaml` | Login → Main → Settings **Log out** (`button-logout`) → Login |

```bash
cd /Users/anambuk/Documents/SeyonGitHub/TutorPodRepo/TutorPod
npm run maestro:critical
maestro test .maestro/sprint4_raise_hand.yaml
maestro test .maestro/sprint4_learning_path_gate.yaml
maestro test .maestro/auth_login.yaml
```

## Automated tests without Maestro
```bash
npm run api:test       # T040 questions + T042 learning paths + OTP stub tests
npm run mobile:test
npm run mobile:lint
```
