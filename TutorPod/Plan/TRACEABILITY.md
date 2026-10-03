# Traceability — Tutor Pod (v2)

| Requirement | User Flow | Screen | API | Code | Test |
|---|---|---|---|---|---|
| R001 Auth gates listen + Learning Path | F002 | Login, Main | pods/*, learning-paths auth | middleware; RootNavigator Login-first | API 401; Maestro login |
| R002 Main tiles (was Home pills) | F004 | **Main** | catalog sections | StudentMainScreen tiles | mainTabs.test |
| R003 Subjects from Standard | F004 | SubjectTopics | GET …/sections/… | SubjectTopicsScreen | Sprint2 catalog API |
| R005 Start podcast | F005 | StartPodcast | POST /pods | StartPodcastScreen | start+stream |
| R008 Streamed player | F007 | Player | GET /pods/:id/audio | PlayerScreen | stream; playerControls |
| R009 Raise-hand pause + AI | F008 | **Player modal** (S011) | POST …/questions; `/ask/transcribe` | PlayerScreen; AskTutorComposer | Sprint4 T040; Maestro raise-hand |
| R010 Learning Path per section | F009 | **LearningPath from Main** | me/learning-paths | LearningPathScreen | Sprint4 T042; Maestro LP |
| R017 Guest browse | — | **Superseded R024** | public catalog still exists | HomeScreen **unregistered** | — |
| R019 Admin default screen | F002 | Admin | user.role | OtpScreen | admin login test |
| R020 Admin CRUD Standard/Section | — | Admin | /admin/standards|sections | AdminScreen; admin.ts | admin CRUD test |
| R021 PDF upload | — | Admin | POST …/pdf | AdminScreen FormData | multipart test |
| R022 Generate chapters | — | Admin | POST …/generate-chapters | chapterGen.ts (OpenAI or stub) | admin generate test; providers.test |
| R023 Edit/delete chapters | — | Admin | PATCH/DELETE chapters | AdminScreen | patch test |

## AI / media providers
- **OpenAI** when `OPENAI_API_KEY` is set: Q&A (`qa.ts` / `ask.ts`), Whisper (`stt.ts`), PDF chapters, podcast TTS (`podcastAudio.ts`)
- **Without key:** stub Q&A/Ask; `503 STT_UNAVAILABLE` (type instead); sample podcast MP3 — app must not crash. See [`docs/ai-providers.md`](docs/ai-providers.md)
- **OTP:** non-prod stub `000000`; production never accepts stub; SMS/email delivery is remaining ops work
- Telemetry: `telemetry/sentry.ts` no-op without `EXPO_PUBLIC_SENTRY_DSN`

## Sprint 5 — Quality gate (status)

| Task | Status | Evidence |
|---|---|---|
| T050 Domain unit suite | **Done** | `apps/api/src/domain/podLimits.ts`; `apps/mobile/src/domain/podLimits.ts` + tests |
| T051 API integration in CI | **Done** | `npm run api:test`; `.github/workflows/ci.yml` |
| T052 E2E critical journey | **Done** | `.maestro/critical_journey.yaml` login-first raise-hand; CI does **not** run Maestro; `npm run maestro:critical` |
| T053 Accessibility | **Done** | [`docs/accessibility-checklist.md`](docs/accessibility-checklist.md); FilterPills/Waveform/Player labels |
| T054 TRACEABILITY filled | **Done** | This file — P0 rows linked to code + tests |

Quality runbook: [`docs/sprint5-quality-gate.md`](docs/sprint5-quality-gate.md).

## Prior sprints
See Sprint 1–4 status sections in git history / plan; all marked **Done** in [`6-implementation-plan.md`](6-implementation-plan.md).

## P1–P2 expansion (T070–T077)

| Requirement | Task | API / Code | Test | Status |
|---|---|---|---|---|
| R013 Search | T070 | GET `/api/v1/search` chapters include standardId; **Main search navigates** | auth-catalog-pods T070; searchHits.test | **Done** |
| R014 Share | T071 | GET `/pods/:id/share`; Player/MyPods Share | T071 API + deepLink unit | **Done** |
| R015 Offline | T072 | `offline/download.ts`; MyPods ↓; Player prefers file | download.test | **Done** (foreground only) |
| R016 Studio | T073 | Unused HomeScreen studio pill | FilterPills.test | **Done** (not on live Main) |
| Pod ready notify | T074 | `notifications/podReady.ts`; Generating banner | podReady.test | **Partial** (local/in-app; no APNs/FCM) |
| Guest LP teaser | T075 | **Superseded** — LP from Main after login | T042 API | **Done** |
| Quotas / rate limits | T076 | `rateLimit.ts` on POST pods/questions | rateLimit.test + API 429 | **Done** |
| S3 storage | T077 | `storage/s3.ts` + local fallback | storage-backend.test | **Done** (env-gated) |

See [`docs/p1-p2.md`](docs/p1-p2.md).

## Appearance (theme)

| Feature | Code | Test | Status |
|---|---|---|---|
| Light / Dark / System | `theme/ThemeContext.tsx`, Settings chips, `kvStore` key `tutorpod.themePreference` | `theme/preference.test.ts` | **Done** |
| Semantic tokens | `theme/tokens.ts` (`darkColors` / `lightColors`), `useTheme().colors` | — | **Done** |

## Student UX v3 (login-first)

| Requirement | Screen / API | Code | Status |
|---|---|---|---|
| R024 Login-first | Login initial route | Splash→Login; LoginScreen | **Done** |
| R025 Settings gate | Settings; `profileComplete` on `/me` | SettingsScreen; AuthContext | **Done** |
| R030 Settings logout | F013; S028; POST `/auth/logout` | SettingsScreen; `settingsLogout.ts`; AuthContext.signOut | **Done** (`settingsLogout.test.ts`) |
| R026 Main tiles | Main | StudentMainScreen (Ask, My Pods, **Learning Path**, subjects) | **Done** |
| R027 Ask any question | AskQuestion; `POST /api/v1/ask` + `/ask/transcribe` | AskQuestionScreen; AskTutorComposer; ask.ts; stt.ts (Whisper / 503 fallback) | **Done** (T086 composer aligned) |
| R028 Subject→topics | SubjectTopics | SubjectTopicsScreen | **Done** |
| R029 Host default 2 | StartPodcast | `useState(2)` | **Done** |

See [`docs/student-main-v3.md`](docs/student-main-v3.md).

## Ask / raise-hand voice composer (T086)

| Requirement | Task | Code | Test | Status |
|---|---|---|---|---|
| R009 + R027 voice+text UX | T086 | `AskTutorComposer`; Player raise-hand; AskQuestionScreen; shared `ask/transcribe` | `ask/audioMeta.test.ts`; Maestro send; API STT reuse | **Done** |
