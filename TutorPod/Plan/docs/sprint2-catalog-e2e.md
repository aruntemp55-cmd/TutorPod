# Sprint 2 — Catalog & Main E2E (Maestro)

Maestro is **not** run in GitHub CI. Flows live under [`.maestro/`](../../.maestro/).

## Flows
| File | Covers |
|---|---|
| `.maestro/catalog_home_browse.yaml` | Login-first Main tiles + Chemistry → Start podcast |
| `.maestro/catalog_soft_prompt_gate.yaml` | Login is first; no guest Home / Start |
| `.maestro/catalog_tabs.yaml` | Main tiles Ask + My Pods (no Home/Account tabs) |

```bash
cd /Users/anambuk/Documents/SeyonGitHub/TutorPodRepo/TutorPod
maestro test .maestro/catalog_home_browse.yaml
maestro test .maestro/catalog_tabs.yaml
```
