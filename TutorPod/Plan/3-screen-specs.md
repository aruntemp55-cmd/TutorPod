# Screen Specifications — Tutor Pod

## Screen inventory

| ID | Screen | Purpose | Entry | Exit |
|---|---|---|---|---|
| S001 | Splash | Brand + session bootstrap | App launch | S002 / S005 |
| S002 | Onboarding | First-run value props | S001 | S005 (browse) / S003 |
| S003 | Login | Email entry (incl. soft-prompt) | Soft-prompt / Sign in / logout | S004 |
| S004 | OTP Verify | Complete auth + resume pending | S003 | Resume target / S005 / S012 / **S028** |
| S005 | Home (All) | Browse chapters (guest OK); gated Play/Start | Tabs / onboarding | S006 / S008 / S009 / S014 / S003 |
| S006 | Start Podcast Sheet | Hosts + context + start (**auth**) | S005 / S009 | S007 / S008 / dismiss |
| S007 | Generating | Wait for pod readiness | S006 | S008 / S010 |
| S008 | Player | Full audio playback (**auth**) | S005 / S006 / S007 / S010 | S010 / S011 / back |
| S009 | Learning Path | Select path (**auth**); guest → sign-in | Pill / S005 | S005 / S006 / S008 / S003 |
| S010 | MyPods | Podcast library (**auth** to listen) | Pill / tab | S008 / S011 / S003 |
| S011 | Raise-hand Q&A Sheet | Ask question; view answer (**auth**) | S008 / S010 | Prior screen |
| S012 | Account | Name, Standard, logout / guest Sign in | Avatar / tab | S005 / **S003 (v3 logout)** |
| S013 | Search (P1) | Search chapters/pods | S005 / S010 | Results → S005 / S008 |
| S014 | Login soft-prompt sheet | Explain gate; continue to auth | Play/Start/Path/MyPods when guest | S003 / dismiss |
| S028 | Settings | Student name, Standard, appearance, **Log out** | OTP incomplete / Main | Main / **Login on logout** |

## Screens

### S001 — Splash
- **Purpose:** Show brand; restore session if any.
- **Entry points:** App launch.
- **Exit destinations:** S002, S005 (guest or auth — **UPDATED:** not forced to Login).

#### UI
- Centered Tutor Pod wordmark / mark on dark background; no Gemini branding.

#### States
- Default / Loading (session check) / Error → S005 guest / Offline (cached session if valid, else guest S005).

#### Interaction
- None (auto-advance).

#### Accessibility
- `accessibilityLabel`: “Tutor Pod loading”; reduce-motion: skip fade.

---

### S002 — Onboarding
- **Purpose:** Explain listen-first tutoring + raise-hand.
- **Entry / Exit:** S001 → S005 (Browse) or S003 (Sign in).

#### UI
- 2–3 pages: podcast lesson, raise-hand, learning path; primary CTA “Get started” → Home All; secondary “Sign in”.

#### States
- Default pages; no network dependency.

#### Interaction
- Swipe pages; tap CTA; skip optional. `[ASSUMPTION: skip allowed → S005 guest.]`

#### Accessibility
- Page indicators announced; CTA min 48×48.

---

### S003 — Login
- **Purpose:** Collect email for OTP (including soft-prompt entry).
- **Entry / Exit:** → S004; back/dismiss may return to S005 with pendingAction cleared if user abandons.

#### UI
- Header “Sign in”; optional context line from soft-prompt (“Sign in to listen” / “Sign in to choose a learning path”); email field; primary “Continue”.

#### States
- Default / Loading (send OTP) / Error (invalid email, network) / Offline banner.

#### Interaction
- Validate email format; submit.

#### Accessibility
- Labeled text field; error text linked via `accessibilityLiveRegion`.

---

### S004 — OTP Verify
- **Purpose:** Verify code; establish session; **resume pending action**.
- **Entry / Exit:** → resume S006/S008/S009 or S005; S012 if Standard missing.

#### UI
- OTP boxes (6). `[ASSUMPTION: 6-digit OTP.]` Resend with cooldown.

#### States
- Default / Loading / Error (wrong code) / Success brief → navigate/resume.

#### Interaction
- Auto-submit on complete; resend.

#### Accessibility
- Each digit field labeled; announce errors.

---

### S005 — Home (All)
- **Purpose:** Main catalog surface with 3 pills and chapter tiles. **UPDATED:** Guest may browse tiles; Play/Start gated.
- **Entry points:** Onboarding, bottom Home, pill All (guest or auth).
- **Exit:** S006, S007, S008, S009, S010, S012, S013, **S014** (guest gate).

#### UI
- **Header:** “Tutor Pod”; search icon (P1); avatar → Account (guest shows Sign in affordance).
- **Pills:** All (selected) | MyPods | Learning Path — horizontally scrollable if needed.
- **Filters:** Standard, Subject selectors (chips or dropdown sheets) — available to guest.
- **List:** Chapter tiles — leading photo/illustration, title, metadata, trailing circular Play.
- **Bottom actions:** **Start podcast** / **+** context — guest tap → S014. `[ASSUMPTION: no camera CTA in MVP.]`
- **Bottom nav:** `[ASSUMPTION: Home | MyPods | Account]` — Learning Path via pill.

#### States
- Default with tiles (guest/auth) / Loading skeletons / Empty / Error / Offline / Success after generation.

#### Interaction
- Tap pill → switch mode; tap filters; **tap Play/Start:** if guest → S014 with pendingAction; if auth → Player or Start sheet; pull to refresh.

#### Accessibility
- Pills as tablist/tab; tiles as buttons with title + “Play”; announce if action requires sign-in.

---

### S006 — Start Podcast Sheet (modal / bottom sheet)
- **Purpose:** Configure hosts (2–4) and optional context; start. **Auth required** (opened only after login / resume).
- **Entry:** S005 / S009 chapter actions (auth); post-S014 resume.
- **Exit:** S007 / S008 / dismiss.

#### UI
- Chapter title summary.
- Host stepper or segmented control: 2 | 3 | 4.
- **+ Add context** expands multiline input.
- Primary CTA “Start podcast”.
- Visual nod to Studio “Audio Overview” only — do not show Video/Slides/Quiz grid as P0.

#### States
- Default / Validation error / Loading submit / Offline blocked / `401` → S014/S003.

#### Interaction
- Change hosts; edit context; start; swipe down dismiss.

#### Accessibility
- Stepper announced value; CTA disabled state explained.

---

### S007 — Generating
- **Purpose:** Communicate pod creation progress.
- **Entry:** S006 submit.
- **Exit:** S008 when ready; S010 if user backgrounds. `[ASSUMPTION: can leave and find pod in MyPods as “Processing”.]`

#### UI
- Indeterminate progress; chapter title; cancel wait (UI only).

#### States
- Loading / Success → Player / Error with retry / Offline.

#### Interaction
- Retry; go to MyPods.

#### Accessibility
- Live region progress updates (throttled).

---

### S008 — Player
- **Purpose:** Immersive playback (screenshot-faithful controls). **Auth required — no anonymous listen.**
- **Entry:** Play actions / generation complete (auth only); guest never reaches with streaming URL.
- **Exit:** Back; S011 raise-hand.

#### UI
- **Header:** Back; truncated pod title; share (P2 disabled/hidden); more menu (P2: report).
- **Visual:** Dual-tone waveform (blue/purple + green) — animated when playing; static when paused. `[ASSUMPTION: stylized waveform visualization, not necessarily real FFT in MVP.]`
- **Row:** Speed label (`1x` cycles 1x → 1.25x → 1.5x → 2x); thumbs up / down.
- **Seek:** Slider; current / duration.
- **Transport:** −10s | large Play/Pause circle | +10s.
- **Raise hand:** Persistent floating or header-adjacent control (also available from MyPods row).

#### States
- Default playing/paused / Buffering / Error audio / Offline (if cached P2; else error) / Reaction success subtle / Session expired → S014.

#### Interaction
- Tap/drag seek; speed cycle; like/dislike toggle; raise hand; hardware back.

#### Accessibility
- All controls labeled; seek announces time; large play target ≥ 56dp.

---

### S009 — Learning Path
- **Purpose:** Choose path per subject; see ordered chapters. **UPDATED: create/select requires login.**
- **Entry:** Pill Learning Path.
- **Exit:** S006 / S008 (auth); S014/S003 (guest).

#### UI
- **Guest:** Full-screen / inline sign-in CTA — “Sign in to choose a learning path” (no path list to select). `[ASSUMPTION: hard-block; no teaser path names.]`
- **Auth:** Subject selector; list of paths; selected checkmark; ordered chapter tiles for active path.

#### States
- Guest sign-in / Default / Loading / Empty (no paths) / Error / Offline.

#### Interaction
- Guest → Sign in (pendingAction=`openLearningPath`). Auth: Select path (confirm if replacing). `[ASSUMPTION: confirm when switching paths with progress.]` Tap chapter → start/play.

#### Accessibility
- Selected path state announced; guest CTA labeled “Sign in to choose a learning path”.

---

### S010 — MyPods
- **Purpose:** Library of student’s podcasts (audio rows). **UPDATED: listen requires login.**
- **Entry:** Pill or tab.
- **Exit:** S008, S011, S014/S003 (guest).

#### UI
- Same header + pills (MyPods selected).
- **Guest:** Sign-in CTA — “Sign in to play your pods” (no audio rows).
- **Auth:** Rows with soundwave icon; title; meta; progress; **Raise hand** + **Play**; processing badge.

#### States
- Guest sign-in / Default list / Loading / Empty CTA / Error / Offline (cached list if any, auth only).

#### Interaction
- Guest → Sign in. Auth: Play; raise hand; pull refresh; tap row → Player.

#### Accessibility
- Row actions as separate accessible actions; progress as “X percent played”; guest CTA clear.

---

### S011 — Raise-hand Q&A Sheet
- **Purpose:** Capture question (text or voice); show answer while audio is paused.
- **Entry:** S008 / S010.
- **Exit:** Resume listening → prior with play; Close without resuming → prior paused.

#### UI
- Header “Ask your tutor” + “Audio paused while you ask.”
- **ChatGPT-style composer (shared with Ask):**
  - **Idle:** Capsule bar — multiline field (“What are you stuck on?”), mic (dictation), primary circular control (waveform when empty; send arrow when text present).
  - **Recording:** Capsule bar — X cancel | live waveform | stop (square) | blue send arrow.
- Answer text below composer when returned.
- Footer: “Resume listening” (accent) + “Close without resuming”.

#### States
- Idle empty / Idle with draft text / Recording / Transcribing / Thinking / Success answer / Error (STT or AI) / Mic denied / Web mic unavailable.

#### Interaction
- Send text → POST questions; voice send → transcribe then POST questions; stop → transcribe into field; cancel recording → discard; resume/close as labeled.

#### Accessibility
- Answer live region; focus to answer on success; icon controls labeled (Cancel recording, Stop recording, Send question, Start voice, Dictate).

---

### S012 — Account
- **Purpose:** Student name + Standard; logout — or guest Sign in. **Student v3 uses S028 Settings** for this; S012 remains for legacy Main tabs.
- **Entry:** Avatar / Account tab.
- **Exit:** S005; **logout → S003 Login (v3)**. Guest Sign in → S003. `[SUPERSEDED: logout confirm → guest Home.]`

#### UI
- **Guest:** Sign in primary CTA + short value copy.
- **Auth:** Avatar initials; display name; Standard selector; version footer; Logout button.

#### States
- Guest / Default / Loading profile / Error / Saving Standard / Offline.

#### Interaction
- Change Standard (saves); logout → `signOut` then Login (login-first). Do not revive guest browse as the logout destination.

#### Accessibility
- Form labels; logout announced (`Log out`).

---

### S028 — Settings (student v3)
- **Purpose:** Name + Standard + appearance; **always Log out** for signed-in students (R025 gate + R030).
- **Entry:** Post-OTP when profile incomplete (`mandatory`); Main gear / Settings when complete.
- **Exit:** Continue/Save → Main; Back to Main (complete profile only); Log out → Login via stack reset.

#### UI
- Title: “Complete your settings” (mandatory) or “Settings”.
- Fields: Student name, Standard chips, Appearance chips (light/dark/system).
- Actions (top to bottom):
  1. **Continue** (mandatory) or **Save** (complete) — primary/light.
  2. **Back to Main** — accent; **only when not mandatory**.
  3. **Log out** — accent; **always** (`testID=button-logout`, accessibility label “Log out”).

#### States
- Mandatory incomplete / Default complete / Saving / Validation error / Loading standards.

#### Interaction
- Continue/Save requires name + Standard; then reset to Main.
- Log out: `signOut()` then `navigation.reset` to Login. Not guest Home. No confirm required.

#### Accessibility
- Named fields; Log out ≥ 44pt target; `accessibilityLabel="Log out"`.

---

### S014 — Login soft-prompt sheet (NEW)
- **Purpose:** Gate listen / Learning Path actions for guests; continue to auth with resume.
- **Entry:** Guest Play, Start podcast, MyPods, Learning Path select.
- **Exit:** S003 (Continue); dismiss → prior screen.

#### UI
- Title + body variants: “Sign in to listen” / “Sign in to start a podcast” / “Sign in to choose a learning path”.
- Primary “Sign in”; secondary “Not now”.
- Dark sheet matching Studio surfaces (`bg.surface`).

#### States
- Default / Dismissed / Continue → S003 with `pendingAction`.

#### Interaction
- Continue preserves pendingAction; Not now clears it. `[ASSUMPTION]`

#### Accessibility
- Announced purpose; both actions ≥ 48 touch targets.

---

### S013 — Search (P1)
- **Purpose:** Find chapters or pods.
- **Entry:** Search icon.
- **Exit:** S005 / S008 / S010.

#### UI
- Search field; segmented Chapters | MyPods; result list.

#### States
- Default / Loading / Empty / Error.

#### Interaction
- Debounced query; tap result.

#### Accessibility
- Search field traits; clear button labeled.
