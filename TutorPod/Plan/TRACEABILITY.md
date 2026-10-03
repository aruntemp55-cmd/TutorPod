# Traceability — Tutor Pod (v2)

| Requirement | User Flow | Screen | API | Code | Test |
|---|---|---|---|---|---|
| R001 Auth gates listen + Learning Path | F002, F012 | S014, Login | pods/*, learning-paths auth | middleware; LoginSoftPrompt; requireAuthForAction | API 401; Sprint3 T036; Maestro soft-prompt |
| R003 Dropdowns Standard→Section→Chapter | F004 | Home | GET catalog …/sections/… | Dropdown; HomeScreen | Sprint2 T020/T021 guest browse |
| R005 Start podcast hierarchy + hosts | F005 | StartPodcast | POST /pods | StartPodcastScreen; pods.ts; podcastAudio.ts | start+stream; providers.test (mock TTS); T031 |
| R008 Streamed player | F007 | Player | GET /pods/:id/audio | PlayerScreen; storage cache | stream test; playerControls |
| R009 Raise-hand pause + AI | F008 | Player modal | POST …/questions | PlayerScreen; qa.ts (OpenAI or stub) | Sprint4 T040; providers.test; Maestro raise-hand |
| R010 Learning Path per section | F009 | Home pill | me/learning-paths | HomeScreen | Sprint4 T042; Maestro LP gate |
| R017 Guest browse | F004 | Home | public catalog | HomeScreen | guest browse; Maestro catalog_home_browse |
| R019 Admin default screen | F002 | Admin | user.role | OtpScreen; SplashScreen | admin login test |
| R020 Admin CRUD Standard/Section | — | Admin | /admin/standards|sections | AdminScreen; admin.ts | admin CRUD test |
| R021 PDF upload | — | Admin | POST …/pdf | AdminScreen FormData | multipart test |
| R022 Generate chapters | — | Admin | POST …/generate-chapters | chapterGen.ts (OpenAI or stub) | admin generate test; providers.test |
| R023 Edit/delete chapters | — | Admin | PATCH/DELETE chapters | AdminScreen | patch test |

## AI / media providers
- **OpenAI** (env-gated via `OPENAI_API_KEY`): Q&A (`services/qa.ts`), PDF→chapters (`services/chapterGen.ts` + `pdf-parse`), podcast TTS (`services/podcastAudio.ts`)
- **Fallback without key:** heuristic chapter stub, stub Q&A, cached sample/seed MP3 — see [`docs/ai-providers.md`](docs/ai-providers.md)
- Telemetry: `telemetry/sentry.ts` no-op without `EXPO_PUBLIC_SENTRY_DSN`

## Sprint 5 — Quality gate (status)

| Task | Status | Evidence |
|---|---|---|
| T050 Domain unit suite | **Done** | `apps/api/src/domain/podLimits.ts`; `apps/mobile/src/domain/podLimits.ts` + tests |
| T051 API integration in CI | **Done** | `npm run api:test`; `.github/workflows/ci.yml` |
| T052 E2E critical journey | **Done** | `.maestro/critical_journey.yaml` → raise-hand journey; headless `npm run ci` |
| T053 Accessibility | **Done** | [`docs/accessibility-checklist.md`](docs/accessibility-checklist.md); FilterPills/Waveform/Player labels |
| T054 TRACEABILITY filled | **Done** | This file — P0 rows linked to code + tests |

Quality runbook: [`docs/sprint5-quality-gate.md`](docs/sprint5-quality-gate.md).

## Prior sprints
See Sprint 1–4 status sections in git history / plan; all marked **Done** in [`6-implementation-plan.md`](6-implementation-plan.md).

## P1–P2 expansion (T070–T077)

| Requirement | Task | API / Code | Test | Status |
|---|---|---|---|---|
| R013 Search | T070 | GET `/api/v1/search`; Home Search pill | auth-catalog-pods T070 | **Done** |
| R014 Share | T071 | GET `/pods/:id/share`; Player/MyPods Share | T071 API + deepLink unit | **Done** |
| R015 Offline | T072 | `offline/download.ts`; MyPods ↓; Player prefers file | download.test | **Done** (foreground only) |
| R016 Studio | T073 | Studio pill grid; Audio + Study briefing | FilterPills.test | **Done** (flashcards/quiz soon) |
| Pod ready notify | T074 | `notifications/podReady.ts`; Generating banner | podReady.test | **Partial** (local/in-app; no APNs/FCM) |
| Guest LP teaser | T075 | Public learning-paths list; select soft-prompt | T075 API + Home | **Done** |
| Quotas / rate limits | T076 | `rateLimit.ts` on POST pods/questions | rateLimit.test + API 429 | **Done** |
| S3 storage | T077 | `storage/s3.ts` + local fallback | storage-backend.test | **Done** (env-gated) |

See [`docs/p1-p2.md`](docs/p1-p2.md).

## Appearance (theme)

| Feature | Code | Test | Status |
|---|---|---|---|
| Light / Dark / System | `theme/ThemeContext.tsx`, Account chips, `kvStore` key `tutorpod.themePreference` | `theme/preference.test.ts` | **Done** |
| Semantic tokens | `theme/tokens.ts` (`darkColors` / `lightColors`), `useTheme().colors` | — | **Done** |
