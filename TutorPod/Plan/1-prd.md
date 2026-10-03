# PRD — Tutor Pod

## Product
- **Name:** Tutor Pod
- **Vision:** A listen-first mobile tutor that turns curriculum chapters into multi-host podcast lessons, with raise-hand Q&A so students can interrupt learning the way they would in a real classroom.
- **Problem statement:** Students often struggle to engage with dense textbook chapters. Reading alone lacks conversational pacing; live tutors do not scale. Students need an always-available audio tutor tied to their Standard, Subject, and Chapter, with a natural way to ask clarifying questions mid-lesson.
- **Target users:** Secondary / senior-secondary students (and optionally parents/teachers as observers later).
- **Personas:**
  - **Priya (student, Class 12):** Commutes 40+ minutes; prefers audio revision; raises hand when a concept is unclear.
  - **Arjun (student, Class 11):** Visual + audio learner; wants structured learning paths per subject and a library of past pods (MyPods).
- **Goals:**
  - Let a logged-in student select Standard → Subject → Chapter and start a podcast (2–4 hosts).
  - Persist generated/started pods under MyPods with play and raise-hand controls.
  - Deliver a full player experience (waveform, seek, ±10s, speed, like/dislike).
  - Support Learning Path selection per subject.
  - Show Account with student name and Standard.
- **Non-goals (v1):**
  - Full NotebookLM-parity Studio (video overview, slide deck, flashcards, quiz, infographic, reports) as P0.
  - Teacher CMS / school admin dashboards.
  - Live multiplayer tutoring or human tutor matching.
  - Offline-first full catalog download (beyond optional later P2).
  - Monetization / payments UI.
- **Key use cases:**
  1. Guest browses All chapter tiles; tapping Play/Start soft-prompts login, then configures hosts + context and starts podcast.
  2. Logged-in student resumes a pod from MyPods, plays audio, seeks, changes speed, likes/dislikes.
  3. Student raises hand during or from a pod row, asks a question, receives an answer grounded in chapter context.
  4. Logged-in student sets a Learning Path for a subject (guest cannot create/select) and browses recommended chapters.
  5. Student views Account (name, Standard); guest sees Sign in.


## Student UX v3 (login-first) — **current**

| ID | Feature | Description | Priority |
|---|---|---|---|
| R024 | Login-first entry | App opens on **Login** (no guest Main / onboarding-first) | P0 |
| R025 | Mandatory settings gate | After student OTP: require **Name** + **Standard** before Main | P0 |
| R026 | Student Main tiles | Search + **Ask any question** + **My Pods** + **subject tiles** for selected Standard | P0 |
| R027 | Ask any question | Chat + voice via ChatGPT-style composer → Whisper STT (`POST /api/v1/ask/transcribe`, env-gated); AI reply (OpenAI or stub); Back → Main | P0 |
| R028 | Subject → topics | Subject tile → topic/chapter tiles → Start podcast | P0 |
| R029 | Host count default | Start podcast **defaults to 2 hosts** | P0 |

- Guests do **not** land on catalog Main.
- Admin login still lands on Admin when `role=admin`.
- Appearance (light/dark/system) remains on Account/Settings.

## Features

| ID | Feature | Description | Priority | User |
|---|---|---|---|---|
| R001 | Auth gates | **v3:** Login is app entry; student needs complete settings for Main; listen/Q&A remain auth-only | P0 | Student |
| R002 | Home pills | Filters: **All**, **MyPods**, **Learning Path** | P0 | Student |
| R003 | Curriculum dropdowns | **v2:** Select **Standard → Section → Chapter** via API-loaded dropdowns (Section replaces Subject) | P0 | Student / Guest |
| R004 | Chapter tiles | List chapter tiles with photos based on current selection/filters | P0 | Student / Guest |
| R005 | Start podcast | Host count 2–4 + standard/section/chapter sent to API — **auth required** | P0 | Student |
| R006 | Topic context (+) | Add optional extra context/notes before generation/start — **auth required** | P0 | Student |
| R007 | MyPods library | List student’s podcasts with play + raise-hand controls — **auth required** | P0 | Student |
| R008 | Streamed audio player | NotebookLM-like player; audio **streamed from server** — **auth required** | P0 | Student |
| R009 | Raise-hand Q&A | **Pause audio**, ask via **text or voice** (ChatGPT-style composer → Whisper STT → pod question), AI answers, resume — **auth required** | P0 | Student |
| R010 | Learning Path | Select/view path per **section** — **auth required to create/select** | P0 | Student |
| R011 | Account | Show student name and Standard; access profile — **auth required** | P0 | Student |
| R019 | Admin role + default Admin screen | Admin login in same app; land on Admin Screen | P0 | Admin |
| R020 | Admin catalog CRUD | Add/update/delete Standard and Section | P0 | Admin |
| R021 | Admin PDF upload | Upload PDF per Standard + Section | P0 | Admin |
| R022 | Admin generate chapters | Generate chapters after PDF upload (stub pipeline OK) | P0 | Admin |
| R023 | Admin edit/delete chapters | Edit and delete generated chapters | P0 | Admin |
| R012 | Playback progress | Persist last position; show progress on MyPods rows | P1 | Student |
| R013 | Search chapters/pods | Search within catalog / MyPods | P1 | Student |
| R014 | Share pod | Share link or deep link to a pod (metadata only) | P2 | Student |
| R015 | Offline download | Download pods for offline listen | P2 | Student |
| R016 | Studio extras | Video/slides/flashcards/quiz/infographic/reports | P2 | Student |
| R017 | Guest catalog browse | **SUPERSEDED by R024** — login-first; no guest Main catalog | — | — |

## Business Rules
- **Business rules:**
  - **UPDATED auth rule (strict):** Authenticated session is **required** to:
    1. **Listen** — Start podcast, play any podcast/audio (chapter Play, MyPods Play, Player), and raise-hand during a listen session.
    2. **Learning Path** — Create, select, or change a learning path for a subject.
  - **Guest allowed:** Onboarding/marketing/login; **browse All** chapter tiles and Standard/Subject filters (no audio, no path selection). `[ASSUMPTION — supersedes prior full login wall]:` soft-prompt at gated CTAs; resume pending action after login.
  - Unauthenticated MyPods / Account / Learning Path pill → sign-in CTA (not silent empty data).
  - Host count must be an integer in **2–4**.
  - A podcast is always scoped to one Chapter (and inherits Subject + Standard).
  - Optional context (+) is free text, max length enforced server-side. `[ASSUMPTION: 2000 characters.]`
  - Learning Path is selected **per subject** (one active path per subject at a time). `[ASSUMPTION]`
  - Like/dislike is one reaction per user per pod (toggleable). `[ASSUMPTION]`
  - Raise-hand **must pause** playback while Q&A UI is open; resume on dismiss.
  - Raise-hand and Ask share the same voice+text composer pattern: idle (text + mic + primary voice/send) and recording (cancel, live waveform, stop, send). Voice uses `POST /api/v1/ask/transcribe`; raise-hand still submits via pod questions.
- Hierarchy is **Standard → Section → Chapter** (Section = former Subject).
- Podcast start payload includes standardId, sectionId, chapterId, hostCount (+ optional context).
- Audio is served via authenticated stream endpoint (not anonymous CDN links in catalog).
- **Permissions:**
  - Guests: catalog read (standards/sections/chapters metadata) only.
  - Students: own MyPods/progress/Q&A/learning-path; catalog read-only.
  - Admins: catalog + PDF + chapter generate/edit/delete; no requirement to use student listen flows.
- **Validation rules:**
  - Standard / Section / Chapter must form a valid hierarchy.
  - Podcast start requires standardId + sectionId + chapterId + hostCount (2–4).
  - Raise-hand question text non-empty; max length. `[ASSUMPTION: 1000 characters.]`
  - PDF upload max size. `[ASSUMPTION: 25MB.]`
- **User restrictions:**
  - Rate limits on podcast start and raise-hand to control AI cost. `[ASSUMPTION: soft limits; exact quotas TBD — see Open Questions.]`
- **Dependencies:**
  - Auth provider, audio CDN/storage, LLM + TTS (or stub) pipeline, curriculum seed data.

## MVP vs Full AI Pipeline

| Capability | MVP (P0 launch) | Full generative (post-MVP) |
|---|---|---|
| Podcast audio | Server **streams** cached/seeded audio file for chapter×hosts; client plays stream URL | Async LLM script + multi-voice TTS |
| PDF → chapters | Stub chapter generation from uploaded PDF metadata/heuristics | Real PDF parse + LLM chapter split |
| Host count 2–4 | Stored on pod metadata; may map to alternate seeded variants when available | True multi-host generation |
| Context (+) | Stored and used as RAG/context for Q&A; may not regenerate full audio in MVP | Regenerates or branches a new pod audio |
| Raise-hand Q&A | LLM answer with chapter-context prompt (streaming preferred); fallback canned error | Streaming + citation snippets + follow-ups |
| Learning Path | Curated ordered chapter lists per subject (seed) | Adaptive path from progress/mastery |

## Success Criteria
- Student can complete Standard → Section → Chapter (dropdowns) → Start podcast (2–4 hosts) → streamed Player after login.
- Admin logs in and lands on Admin Screen; can CRUD Standard/Section, upload PDF, generate and edit/delete chapters.
- Raise-hand pauses audio, returns AI answer, allows resume.
- **UPDATED:** Guest can browse All tiles but **cannot** start/play audio or select a Learning Path without completing login (soft-prompt → resume).
- **UPDATED:** Unauthenticated Play / Start podcast / Learning Path select always redirects to auth; no anonymous audio streaming.
- MyPods shows started pods with play and raise-hand; player supports seek, ±10s, speed, like/dislike.
- Raise-hand returns a visible answer for a valid question in under an agreed latency budget. `[ASSUMPTION: p95 < 8s for MVP text answer.]`
- Learning Path can be selected for a subject (only when logged in) and filters/recommends chapters accordingly.
- Account displays name and Standard.
- All P0 features covered by acceptance tests in the implementation plan.
- Dark Studio-inspired UI matches design tokens in `5-ui-design.md` (Tutor Pod brand, not Gemini/NotebookLM copy).

## Assumptions
- `[ASSUMPTION — UPDATED: Guest may browse All catalog tiles; login required for listen + Learning Path select (soft-prompt + resume). Supersedes “full app behind login”.]`
- `[ASSUMPTION: Stack = React Native + Expo (mobile), Node.js + TypeScript + PostgreSQL (backend).]`
- `[ASSUMPTION: Curriculum pilot = India CBSE Class 11–12 Chemistry chapters as seed catalog (expandable).]`
- `[ASSUMPTION: Auth = email + OTP for MVP (social/SSO later).]`
- `[ASSUMPTION: MVP podcasts primarily from seeded audio library; generation API exists as async job with stub/seed fulfillment.]`
- `[ASSUMPTION: Raise-hand uses online LLM; offline FAQ not in MVP.]`
- `[ASSUMPTION: English primary locale for MVP audio and UI.]`
- `[ASSUMPTION: Single active Learning Path per section.]`
- `[ASSUMPTION: Admin identified by users.role = 'admin'; seeded admin@tutorpod.local.]`
- `[ASSUMPTION: PDF stored on local disk under apps/api/storage; S3 later.]`
- `[ASSUMPTION: Chapter generation from PDF is stubbed unless PDF_PARSE_MODE=real and keys configured.]`
- `[ASSUMPTION: Bottom nav for MVP = Home (All), MyPods, Account — Learning Path accessible via pill + dedicated screen; Studio-style generate mapped to Start podcast sheet, not a third-party Studio clone.]`
- `[ASSUMPTION: Chapter tile “photos” are curated subject/chapter images from CDN/seed assets.]`

## Open Questions
1. Auth provider final choice (email/OTP vs Google vs school SSO)?
2. Exact board/region and Standard range beyond CBSE 11–12 Chemistry pilot?
3. Raise-hand: streaming tokens vs single-shot response; show sources/citations?
4. Podcast generation SLA and cost limits (hosts × context → when to regenerate vs reuse)?
5. Monetization / free-tier quotas for generation and Q&A?
6. Parent/teacher visibility needed in v1?
7. Deep linking / share requirements for launch?
8. Accessibility / language localization timeline (Hindi, etc.)?
9. **(NEW)** Should guest see Learning Path pill content as teaser (path names only) or hard-block the pill with sign-in CTA only? `[ASSUMPTION: hard-block Learning Path pill — sign-in CTA; no path selection UI until logged in.]`
10. **(NEW)** Resume pending action after soft-prompt login always? `[ASSUMPTION: yes.]`
