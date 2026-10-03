# User Flows — Tutor Pod

## Flow map (tree)

```text
App Launch
 ↓
Splash
 ↓
Onboarding (first launch only)
 ↓
Home (All) — guest OK for browse  OR  Login if user chose Sign in
 ├── All (guest or student)
 │    ├── Select Standard / Subject filters (browse OK)
 │    ├── Browse chapter tiles (photo + title + meta)
 │    ├── Tap Play / Start podcast
 │    │    ├── [GUEST] → Login soft-prompt → OTP → resume Start/Player
 │    │    └── [AUTH] → Start Podcast sheet → Generating → Player / MyPods
 │    └── …
 │
 ├── MyPods
 │    ├── [GUEST] → Sign-in CTA (no listen without login)
 │    └── [AUTH] Pod rows → Player / Raise-hand
 │
 ├── Learning Path
 │    ├── [GUEST] → Sign-in CTA (create/select path requires login)
 │    └── [AUTH] Select subject → Choose path → chapters → Start / Play
 │
 └── Account
      ├── [GUEST] → Sign in
      └── [AUTH] Name + Standard / Logout → **Login (v3)**; Settings (S028) is the student path

Error / Offline / Empty branches from each major screen
```

## Mermaid

```mermaid
flowchart TD
  A[Splash] --> B{First launch?}
  B -->|Yes| C[Onboarding]
  B -->|No| D{Session valid?}
  C --> F[Home - All browse OK]
  D -->|No guest| F
  D -->|Yes| F

  F --> G[Filter pills]
  G --> F
  G --> H[MyPods]
  G --> I[Learning Path]

  F --> J[Curriculum pickers]
  J --> K[Chapter tiles]
  K --> L{Play or Start?}
  L -->|Guest| E[Login soft-prompt / OTP]
  E -->|Resume| M[Start sheet or Player]
  L -->|Auth| M
  M --> N[Create pod job if start]
  N --> O[Player]
  N --> H

  H -->|Guest| E
  H -->|Auth| O
  H --> P[Raise-hand Q&A]
  O --> P
  P --> Q[Answer view]
  Q --> O

  I -->|Guest| E
  I -->|Auth| R[Select path per subject]
  R --> K

  F --> S[Account]
  H --> S
  I --> S
  S -->|Guest| E
  S -->|Auth logout (legacy guest Home)| E
```

**v3 login-first (current):** student Settings logout goes to **Login**, not guest Home. See F013.

```mermaid
flowchart TD
  L[Login] --> O[OTP]
  O -->|admin| A[Admin]
  O -->|student incomplete| ST[Settings S028]
  O -->|student complete| M[Main]
  ST -->|Save Continue| M
  M --> ST
  ST -->|Log out signOut| L
```

```mermaid
sequenceDiagram
  participant U as Student
  participant App as Tutor Pod App
  participant API as Backend
  participant AI as LLM/TTS

  U->>App: Select Chapter + hosts + context
  App->>API: POST /pods
  API-->>App: podId status=generating|ready
  alt MVP seeded audio
    API-->>App: audioUrl ready
  else Full pipeline
    API->>AI: Generate script + TTS
    AI-->>API: audio asset
    API-->>App: status=ready
  end
  U->>App: Play
  App->>API: GET /pods/:id + progress
  U->>App: Raise hand + question
  App->>API: POST /pods/:id/questions
  API->>AI: Chapter-grounded answer
  AI-->>API: answer text
  API-->>App: question + answer
  App-->>U: Show answer sheet
```

## Flows

### F001 — First-time launch & onboarding
- **Entry point:** Cold start, no local “onboardingComplete” flag.
- **User action:** Swipe/read short value props; tap Get started / Browse.
- **System response:** Persist onboarding flag; navigate to **Home All** (guest browse). Optional “Sign in” from header. **UPDATED:** no hard login wall after onboarding.
- **Next step:** F004 (browse) or F002 if user chooses Sign in.
- **Success state:** Onboarding complete → Home All.
- **Error state:** N/A (local only).
- **Empty state:** N/A.
- **Loading state:** Splash brand mark.
- **Back navigation:** Exit app on root back (platform default).

### F002 — Authentication (login / soft-prompt)
- **Entry point:** Explicit Sign in; **or soft-prompt** from Play / Start podcast / MyPods listen / Learning Path select / Account; or expired session on gated API.
- **User action:** Enter email → request OTP → enter OTP.
- **System response:** Validate OTP; issue session tokens; fetch profile (name, Standard); **resume pending action** if soft-prompt context exists. `[ASSUMPTION: resume Play/Start/Learning Path after login.]`
- **Next step:** Resume target (F005 / F007 / F009) or Home (All). If Standard missing → prompt set Standard. `[ASSUMPTION: Standard collected at signup or first Account prompt.]`
- **Success state:** Authenticated; gated action continues.
- **Error state:** Invalid OTP, rate limit, network error with retry.
- **Empty state:** N/A.
- **Loading state:** Verifying OTP spinner on CTA.
- **Back navigation:** From OTP back to email; dismiss soft-prompt returns to prior browse screen **without** playing audio.

### F003 — Returning user
- **Entry point:** App launch with valid refresh token (or guest with no session).
- **User action:** Open app.
- **System response:** If session valid → silent refresh + Home with last filters; if guest → Home All browse. `[ASSUMPTION: remember last Standard/Subject for both guest and auth.]`
- **Next step:** Home.
- **Success / Error / Empty / Loading / Back:** Session restore spinner; on refresh failure clear tokens → guest Home (not forced Login).

### F004 — Home / All — browse & filter chapters
- **Entry point:** Bottom nav Home or pill **All** (guest or auth).
- **User action:** Change Standard / Subject; scroll chapter tiles; optional search (P1).
- **System response:** Fetch **public catalog** chapters; render photo tiles + meta + play affordance.
- **Next step:** If auth → F005 / F007; if guest taps Play/Start → **F012 soft-prompt** then F005/F007.
- **Success state:** Tiles populated (guest or auth).
- **Error state:** Catalog fetch failed → retry banner.
- **Empty state:** “No chapters for this selection.”
- **Loading state:** Skeleton tiles.
- **Back navigation:** N/A (root tab).

### F005 — Start podcast (hosts + context) — auth required
- **Entry point:** Chapter tile CTA / “Start podcast” (only after auth or post soft-prompt resume).
- **User action:** Set hosts 2–4; optional + context; confirm Start.
- **System response:** Guard: if unauthenticated → F012. Else `POST /pods`; generating → Player / MyPods.
- **Next step:** F007 Player.
- **Success state:** Pod ready, playback starts (or user taps Play). `[ASSUMPTION: auto-navigate to Player when ready.]`
- **Error state:** Validation (hosts), quota, generation failure → message + retry; `401` → F012.
- **Empty state:** N/A.
- **Loading state:** Generating overlay / indeterminate progress.
- **Back navigation:** Dismiss sheet cancels unconfirmed start; in-flight job continues server-side. `[ASSUMPTION]`

### F006 — MyPods library — auth required to listen
- **Entry point:** Pill **MyPods** or bottom nav MyPods.
- **User action:** Scroll pods; tap Play; tap Raise hand; pull to refresh.
- **System response:** **UPDATED:** Guest → sign-in CTA (no pod list / no play). Auth → list pods with duration, progress, raise-hand, play.
- **Next step:** F007 or F008 (auth); F012 (guest).
- **Success state:** Non-empty list or empty CTA to start first pod.
- **Error / Empty / Loading / Back:** Guest empty = sign-in; auth empty → “Start a podcast from All.”

### F007 — Audio player — auth required
- **Entry point:** Play from chapter tile, MyPods row, or post-generation (**auth only**; deep link without session → F012).
- **User action:** Play/pause, seek, ±10s, speed cycle, like/dislike, raise hand, back.
- **System response:** Never stream audio anonymously; persist progress; save reaction.
- **Next step:** F008; back to previous list.
- **Success state:** Smooth playback with accurate times.
- **Error state:** Audio URL failure → retry; `401` → F012; reaction failure toast (non-blocking).
- **Empty state:** N/A.
- **Loading state:** Buffering indicator on play button / seek bar.
- **Back navigation:** Preserve position; return to MyPods or All.

### F008 — Raise-hand Q&A
- **Entry point:** Raise-hand on MyPods row or Player (implies auth + active listen context).
- **User action:** Type question and send, **or** tap mic/voice → record → stop (fills text) or send (transcribe + submit). Composer matches ChatGPT idle/recording bars.
- **System response:** Pause audio; voice → `POST /api/v1/ask/transcribe` → `POST …/questions`; show answer; Resume listening / Close without resuming.
- **Next step:** Return to Player/MyPods; answer on sheet.
- **Success state:** Answer displayed; audio still paused until resume/close.
- **Error state:** STT unavailable/failed → type instead; AI/timeout → friendly retry; mic denied / web unavailable → message; offline → blocked.
- **Empty state:** Idle composer placeholder “What are you stuck on?”
- **Loading state:** Transcribing… / Thinking… (composer disabled except cancel while recording).
- **Back navigation:** Close sheet; optional resume from pause point.

### F009 — Learning Path — auth required to create/select
- **Entry point:** Pill **Learning Path**.
- **User action:** Pick subject → select path → open recommended chapter.
- **System response:** **UPDATED:** Guest → sign-in CTA (no path create/select). Auth → load paths; save selection; list ordered chapters. Play/Start on chapters still subject to listen auth (already satisfied).
- **Next step:** F005 / F007; or F012 if guest.
- **Success state:** Path active badge on subject; ordered list shown.
- **Error / Empty / Loading / Back:** Guest = sign-in CTA; empty if no paths seeded; error retry.

### F010 — Account
- **Entry point:** Avatar / Account tab (legacy Home tabs).
- **User action:** View name + Standard; optionally edit Standard; logout — or Sign in if guest.
- **System response:** Guest → Sign in CTA; Auth → profile; PATCH Standard.
- **Logout (v3 / current student app):** clear session via `POST /auth/logout` → **Login (S003)**. Do **not** send students to guest Home. `[SUPERSEDED: logout → guest browse F004.]`
- **Next step:** Home after Standard change (legacy); student v3 uses Settings (F013) instead of Account for this path.
- **Success / Error / Empty / Loading / Back:** Form validation on Standard. Confirm dialog is optional; current Settings logout is immediate. `[ASSUMPTION: no confirm required on Settings.]`

### F013 — Student Settings logout (v3, login-first)
- **Entry point:** Settings (S028) — mandatory Name+Standard gate **or** Main → Settings (completed profile).
- **User action:** Tap **Log out** (always visible for signed-in students).
- **System response:** `useAuth().signOut()` → `POST /api/v1/auth/logout`; then `navigation.reset` to Login.
- **Next step:** S003 Login. Not guest Home / S005.
- **Success state:** Session cleared; Login is the only root route.
- **Error state:** Logout API failure still clears local session (client ignore) and still lands on Login.
- **Empty / Loading / Back:** Log out remains available while saving is idle; Back to Main only when profile is complete (not on mandatory gate).

### F012 — Login soft-prompt + resume (NEW)
- **Entry point:** Guest taps Play, Start podcast, MyPods listen, Learning Path select/create, or raise-hand.
- **User action:** Sign in / Continue to OTP; or Cancel.
- **System response:** Present modal/sheet explaining why login is needed; stash `pendingAction` (`playChapter`, `startPodcast`, `openLearningPath`, `playPod`); on success run F002 → resume.
- **Next step:** F005 / F007 / F009 as pending; Cancel → prior screen, no audio.
- **Success state:** Pending action executes once.
- **Error state:** Auth errors stay on F002; pendingAction retained until cancel/success. `[ASSUMPTION]`
- **Empty / Loading / Back:** Cancel clears pendingAction.

### F011 — Error / offline recovery
- **Entry point:** Any network failure.
- **User action:** Retry / open settings.
- **System response:** Banner or full-screen offline; queue non-critical progress sync. `[ASSUMPTION: progress sync retries when online; Q&A and start-pod require online.]`
- **Next step:** Resume prior screen.
- **Success / Error / Empty / Loading / Back:** As applicable.

## Notification flow
- `[ASSUMPTION: No push notifications in MVP.]` Optional P2: “Your podcast is ready” when generation completes in background.
