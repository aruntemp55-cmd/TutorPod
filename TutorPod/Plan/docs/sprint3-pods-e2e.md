# Sprint 3 — Pods / Player E2E (Maestro)

Maestro is **not** run in GitHub CI. Flows: [`.maestro/`](../../.maestro/).

## Flows
| File | Covers |
|---|---|
| `.maestro/pods_start_player.yaml` | Login → Main → Chemistry → Start → Player |
| `.maestro/pods_mypods.yaml` | Login → My Pods tile |

```bash
cd /Users/anambuk/Documents/SeyonGitHub/TutorPodRepo/TutorPod
maestro test .maestro/pods_start_player.yaml
maestro test .maestro/pods_mypods.yaml
```

OTP stub: **`000000`**.
