# Implementation Plan — Tutor Pod

## Order of work
1. Monorepo / Expo app + Node API scaffold, theme tokens, auth.
2. Catalog seed (CBSE 11–12 Chemistry) + Home browse + pills shell.
3. Pods create/list + MyPods + Player (seeded audio).
4. Raise-hand Q&A + Learning Path + Account polish.
5. Hardening, tests, store-ready config — **still gated on plan approval before any Phase 7 code.**

## Stack confirmation
- Mobile: **React Native + Expo**
- Backend: **Node.js + TypeScript + PostgreSQL** `[ASSUMPTION]`
- Audio: Expo AV / `expo-audio` `[ASSUMPTION: prefer maintained Expo audio API at implement time]`

## Sprints

### Sprint 0 — Scaffold & design system
Sprint status: **Done**

| Task ID | Status | Description | Files/components | Dependencies | Acceptance | Tests |
|---|---|---|---|---|---|---|
| T001 | **Done** | Init Expo app + TS + navigation | `apps/mobile/**` | Plan approval | App launches to Splash | Smoke launch |
| T002 | **Done** | Theme tokens + core primitives | `theme/`, Button, Empty, Error | T001 | Matches `5-ui-design.md` dark tokens | Snapshot/unit token map |
| T003 | **Done** | API project + Postgres schema migrations | `apps/api/**`, migrations | Plan approval | Migrations apply clean | Migration CI |
| T004 | **Done** | Env config, logging, error shape | API + mobile config | T001, T003 | No hardcoded secrets | Config unit |

### Sprint 1 — Auth & profile
Sprint status: **Done**

| Task ID | Status | Description | Files/components | Dependencies | Acceptance | Tests |
|---|---|---|---|---|---|---|
| T010 | **Done** | OTP request/verify/refresh/logout | Auth routes, JWT | T003 | Login issues tokens | `auth-catalog-pods` Sprint1 T010 |
| T011 | **Done** | Auth screens + secure token storage | S003, S004, session store | T001, T010 | Login works; guest can reach Home | Maestro `.maestro/auth_login.yaml` + API |
| T012 | **Done** | Onboarding + Splash → Home All (guest OK) | S001, S002 | T011 | First-run lands on browse without forced login | `onboardingFlag.test.ts` + Maestro |
| T013 | **Done** | Account GET/PATCH name & Standard; guest Sign in CTA | S012, `/me` | T010 | Auth profile; guest CTA | Sprint1 T013 API + AccountScreen |
| T014 | **Done** | Login soft-prompt + `pendingAction` resume | S014, `LoginSoftPrompt`, auth store | T011 | Play/Start/Path resume after OTP | `pendingAction.test.ts` + Maestro soft-prompt |

See [`Plan/docs/sprint1-auth-e2e.md`](docs/sprint1-auth-e2e.md) for Maestro install/run (CLI not required in CI).

### Sprint 2 — Catalog & Home
Sprint status: **Done**

| Task ID | Status | Description | Files/components | Dependencies | Acceptance | Tests |
|---|---|---|---|---|---|---|
| T020 | **Done** | Seed Standards/Sections/Chapters + images | `seed.ts` | T003 | Chemistry pilot data present | Sprint2 T020 seed verification |
| T021 | **Done** | Catalog APIs **public browse** (sections + subjects alias) | GET catalog/* | T020 | Guest 200; no audio in payload | Sprint2 T021 + guest browse |
| T022 | **Done** | Home All + FilterPills + dropdowns (guest browse) | S005, FilterPills, ChapterTile, Dropdown | T002, T021 | Guest sees tiles; Play → soft-prompt | `FilterPills.test` + Maestro browse |
| T023 | **Done** | Bottom tabs Home/MyPods/Account | MainTabs | T011 | Tab navigation works | `mainTabs.test` + Maestro tabs |
| T024 | **Done** | Wire Play/Start/Path through `requireAuthForAction` | ChapterTile, Start CTA, pills | T014, T022 | Guest never opens Player | `requireAuthForAction.test` + Maestro gate |

See [`Plan/docs/sprint2-catalog-e2e.md`](docs/sprint2-catalog-e2e.md) for Maestro install/run.

### Sprint 3 — Start podcast, MyPods, Player
Sprint status: **Done**

| Task ID | Status | Description | Files/components | Dependencies | Acceptance | Tests |
|---|---|---|---|---|---|---|
| T030 | **Done** | SeedAudioVariant + POST /pods → generating → ready | `pods.ts`, seed variants | T020 | Pod ready with stream URL after poll | start+stream (+ waitPodReady) |
| T031 | **Done** | StartPodcast hosts 2–4 + context | StartPodcastScreen | T022, T030 | Validation + create | Sprint3 T031 + UI |
| T032 | **Done** | Generating poll UX | GeneratingScreen, GET `/status` | T030 | Transitions to Player | API poll + GeneratingScreen |
| T033 | **Done** | GET /pods list + MyPods UI; guest CTA | MyPodsScreen, PodRow | T030, T014 | Auth rows; guest cannot listen | Maestro `pods_mypods` |
| T034 | **Done** | Player stream + waveform/±10/speed/play | PlayerScreen, Waveform, playerControls | T033 | Controls match spec | `playerControls.test` + Maestro |
| T035 | **Done** | Progress + like/dislike APIs & UI | `/progress`, `/reaction`, Player | T034 | Persist across relaunch | Sprint3 T035 |
| T036 | **Done** | Auth on pods/audio/progress/reaction | API AuthZ | T030 | Guest → 401 | Sprint3 T036 |

See [`Plan/docs/sprint3-pods-e2e.md`](docs/sprint3-pods-e2e.md).

### Sprint 4 — Raise-hand, Learning Path, polish
Sprint status: **Done**

| Task ID | Status | Description | Files/components | Dependencies | Acceptance | Tests |
|---|---|---|---|---|---|---|
| T040 | **Done** | Questions API + stubbable LLM adapter | `qa.ts`, POST `/questions` | T030 | Answer or graceful fail | `qa.test` + Sprint4 T040 |
| T041 | **Done** | Raise-hand sheet pauses audio | PlayerScreen modal | T034, T040 | Ask → answer → resume | Maestro `sprint4_raise_hand` |
| T042 | **Done** | Learning path APIs + seed (auth) | catalog paths, `/me/learning-paths` | T020 | Select per section; guest 401 | Sprint4 T042 |
| T043 | **Done** | Learning Path pill + guest CTA | HomeScreen pill / soft-prompt | T042, T014, T022 | Guest gated; auth select | Maestro learning-path gate |
| T044 | **Done** | Empty/error/offline banners | EmptyState, ErrorBanner, OfflineBanner | T022+ | Critical screens covered | `ui.polish` + connectivity tests |
| T045 | **Done** | Telemetry (Sentry-shaped, optional DSN) | `telemetry/sentry.ts` | T001 | No-op without DSN; events when set | `sentry.test` |
| T046 | **Done** | E2E guest soft-prompt resume + LP gate | Maestro flows | T014, T024, T034, T043 | Both gates proven | `sprint4_guest_*` + LP gate |

See [`Plan/docs/sprint4-raise-path-e2e.md`](docs/sprint4-raise-path-e2e.md).

### Sprint 5 — Quality gate (pre-release)
Sprint status: **Done**

| Task ID | Status | Description | Files/components | Dependencies | Acceptance | Tests |
|---|---|---|---|---|---|---|
| T050 | **Done** | Domain unit suite (hosts/context/question limits) | `domain/podLimits` API+mobile | Sprint 3–4 | Critical path coverage | `domain-podLimits.test` + mobile domain tests |
| T051 | **Done** | Integration tests API | auth, pods, Q&A, catalog | T040 | CI green | `auth-catalog-pods` + `qa.test` via `npm run ci` |
| T052 | **Done** | E2E critical journey (Maestro optional in CI) | `.maestro/critical_journey.yaml` | All P0 screens | Login→Start→Play→Raise hand | Maestro runbook + headless CI |
| T053 | **Done** | Accessibility checklist + easy labels | checklist; FilterPills/Waveform/Player | UI complete | VO/TB spot-check doc | [`accessibility-checklist.md`](docs/accessibility-checklist.md) |
| T054 | **Done** | TRACEABILITY code/test columns filled | `Plan/TRACEABILITY.md` | T050–T052 | All P0 rows linked | Review |

See [`Plan/docs/sprint5-quality-gate.md`](docs/sprint5-quality-gate.md). CI: `.github/workflows/ci.yml` + `npm run ci`.

## Out of scope (future)
- Full push provider (APNs/FCM credentials) beyond local notifications.
- True background download manager / DRM offline.
- Guest audio listen (still auth-gated).

## Risks / notes
- **AI cost/latency** for Q&A — keep adapter mockable; timeouts clear.
- **Audio licensing** for seed voices/assets — confirm before production.
- **Generation expectations** — product copy must say MVP may use prepared lessons when full TTS not ready.
- **Auth provider** may change (Open Question) — isolate behind auth module.
- **Auth gate regressions** — ensure CDN/audio URLs are never embedded in public catalog payloads.
- **Plan approved** — Phase 7 MVP + Sprints 0–5 + Admin-v2 + env-gated OpenAI; P1–P2 features below.

## Sprint Admin-v2
Sprint status: **Done**

| Task ID | Status | Description |
|---|---|---|
| T060–T069 | **Done** | Roles, Section cascade, admin CRUD, PDF, generate/edit chapters, stream pods, raise-hand pause, admin default route, UI polish |

## Sprint P1–P2 — Expansion
Sprint status: **Done** with Partial where infra-limited

| Task ID | Status | Description | Acceptance | Tests |
|---|---|---|---|---|
| T070 | **Done** | Search standards/sections/chapters (+ optional pods) | GET `/search`; Home Search UI | API search test |
| T071 | **Done** | Share chapter/pod deep link + share sheet | Player/MyPods Share | unit share URL |
| T072 | **Done** | Offline download pod audio + indicator (foreground) | Local cache; Player prefers file | offline store unit |
| T073 | **Done** | Studio grid (Audio + Study briefing; others soon) | Studio pill/grid | FilterPills test |
| T074 | **Partial** | Pod-ready local notification / in-app banner | Generating→ready notifies | notification helper unit |
| T075 | **Done** | Guest Learning Path teaser (names; select gated) | Public path list teaser | API guest 200 teaser |
| T076 | **Done** | Rate limits + pod create quotas | Env-configurable 429 | rateLimit unit + API |
| T077 | **Done** | S3-compatible storage (optional env gate) | Fallback local `storage/` | storage backend unit |

See [`Plan/docs/p1-p2.md`](docs/p1-p2.md).

## Sprint Student-v3 — Login-first Main
Sprint status: **Done**

| Task ID | Status | Description |
|---|---|---|
| T080 | **Done** | Login-first entry; remove guest Main CTA |
| T081 | **Done** | Mandatory Name+Standard Settings gate |
| T082 | **Done** | Main tiles: Search, Ask, MyPods, subjects |
| T083 | **Done** | Ask any question chat + voice (stub STT) |
| T084 | **Done** | Subject → topic tiles → Start (host default 2) |
| T085 | **Done** | `POST /api/v1/ask` + profileComplete on `/me` |

