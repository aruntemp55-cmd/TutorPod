# Tutor Pod

NotebookLM-style listen-first tutor: **Standard → Section → Chapter** dropdowns, streamed podcasts, raise-hand Q&A (pauses audio). **Admins** manage catalog, upload PDFs, and generate/edit chapters in the same app.

**Status:** Plan v2 + regenerated MVP (`apps/api` + `apps/mobile`).

## Credentials (dev)

| Role | Email | OTP |
|---|---|---|
| **Admin** | `admin@tutorpod.local` | `000000` |
| **Student** | any other email | `000000` |

Admin login opens the **Admin** screen by default.

## Auth rules

- Guest: browse catalog dropdowns/tiles
- Student: login to listen / Learning Path / raise-hand
- Admin: catalog CRUD, PDF upload, generate/edit/delete chapters

## Setup & run

```bash
psql -d postgres -c "CREATE DATABASE tutorpod;"   # once
cd /Users/anambuk/Documents/SeyonGitHub/TutorPod
cp apps/api/.env.example apps/api/.env            # set DATABASE_URL
npm run setup                                     # install + migrate + seed
npm run api                                       # :4010
npm run mobile                                    # Expo
```

## Implemented vs stubbed

| Capability | Status |
|---|---|
| Student dropdowns Standard/Section/Chapter | **Real** (API) |
| Start podcast payload + host count | **Real** |
| Audio streamed from server (`GET /pods/:id/audio`) | **Real** — OpenAI multi-host TTS when `OPENAI_API_KEY` set; else sample/seed MP3 |
| Raise-hand pauses + AI answer + resume | **Real** — OpenAI chat when keyed; else stub answer |
| Admin CRUD Standard/Section | **Real** |
| PDF upload | **Real** (local `apps/api/storage/pdfs`) |
| Generate chapters from PDF | **Real** — PDF text + OpenAI when keyed; else heuristic stub |
| Multi-host TTS / PDF LLM | **Env-gated OpenAI** (see `Plan/docs/ai-providers.md`) |
| Search (standards/sections/chapters/pods) | **Real** — Home Search pill + `GET /api/v1/search` |
| Share pod deep link | **Real** — Player/MyPods share sheet (`tutorpod://`) |
| Offline download | **Real** — foreground cache via expo-file-system |
| Studio multi-format grid | **Partial** — Audio + Study briefing; flashcards/quiz soon |
| Pod-ready push | **Partial** — local notification + in-app banner (no APNs/FCM) |
| Guest Learning Path teaser | **Real** — names public; select soft-prompt |
| Rate limits / pod quotas | **Real** — env `RATE_LIMIT_*` / `POD_DAILY_QUOTA` |
| S3 storage | **Env-gated** — local `storage/` when `S3_*` unset |

P1–P2 details: [`Plan/docs/p1-p2.md`](Plan/docs/p1-p2.md).

## Tests

```bash
npm run ci                 # api:test + mobile:lint + mobile:test
npm run api:test
npm run mobile:lint
npm run mobile:test   # pendingAction + onboardingFlag unit (Sprint 1)
```

### Auth E2E (Maestro — local device/simulator)

Maestro CLI is optional (not assumed in CI). Flows: `.maestro/auth_login.yaml`, `.maestro/auth_soft_prompt_resume.yaml`.

```bash
# Install: https://maestro.mobile.dev
npm run api && npm run mobile   # separate terminals; OTP stub 000000
maestro test .maestro/auth_login.yaml
maestro test .maestro/auth_soft_prompt_resume.yaml
```

Details: [`Plan/docs/sprint1-auth-e2e.md`](Plan/docs/sprint1-auth-e2e.md).

### Catalog / Home E2E (Sprint 2)

```bash
npm run mobile:test
maestro test .maestro/catalog_home_browse.yaml
maestro test .maestro/catalog_soft_prompt_gate.yaml
maestro test .maestro/catalog_tabs.yaml
```

Details: [`Plan/docs/sprint2-catalog-e2e.md`](Plan/docs/sprint2-catalog-e2e.md).

### Pods / Player E2E (Sprint 3)

```bash
maestro test .maestro/pods_start_player.yaml
maestro test .maestro/pods_mypods.yaml
```

Details: [`Plan/docs/sprint3-pods-e2e.md`](Plan/docs/sprint3-pods-e2e.md).

### Raise-hand / Learning Path E2E (Sprint 4)

```bash
maestro test .maestro/sprint4_raise_hand.yaml
maestro test .maestro/sprint4_learning_path_gate.yaml
maestro test .maestro/sprint4_guest_soft_prompt_resume.yaml
```

Optional: `EXPO_PUBLIC_SENTRY_DSN` enables telemetry (no-op if unset).

Details: [`Plan/docs/sprint4-raise-path-e2e.md`](Plan/docs/sprint4-raise-path-e2e.md).

### Quality gate (Sprint 5)

```bash
npm run ci
maestro test .maestro/critical_journey.yaml   # optional device E2E
```

Docs: [`Plan/docs/sprint5-quality-gate.md`](Plan/docs/sprint5-quality-gate.md), [`Plan/docs/accessibility-checklist.md`](Plan/docs/accessibility-checklist.md).
CI workflow: `.github/workflows/ci.yml`.

## Plan

See [`Plan/`](./Plan/) — especially `0-plan-summary.md`, `4-api-data-v2-delta.md`, `TRACEABILITY.md`.
