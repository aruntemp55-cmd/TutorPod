# UI Design System — Tutor Pod

## Design system source
- **Inspiration:** NotebookLM / Gemini Notebook dark Studio UI (attached screenshots) — patterns only.
- **Brand:** Tutor Pod original naming, icons, and accent; **do not** ship Gemini/NotebookLM trademarks, wordmarks, or cloned feature grids as P0.
- **Tokens path (to create in Phase 7):** `apps/mobile/src/theme/tokens.ts` `[ASSUMPTION]`

## Product UI mapping from screenshots

| Screenshot pattern | Tutor Pod mapping | P0? |
|---|---|---|
| Pill filters (All / My notebooks / …) | **All / MyPods / Learning Path** | Yes |
| Chapter/notebook card + play | Chapter tile with photo + play | Yes |
| Create New FAB | **Start podcast** primary CTA | Yes |
| Camera FAB | Not used | No |
| Studio generate grid (7 tiles) | Collapse to **Start podcast** sheet (hosts + context); Audio Overview metaphor only | Partial |
| Audio row + raise-hand + play | MyPods row | Yes |
| Player waveform + ±10 + speed + like/dislike | Player screen | Yes |
| Sources / Chat / Studio bottom tabs | **Home / MyPods / Account** | Yes (adapted) |

## Tokens

### Colors (dark-first MVP)
| Token | Hex | Usage |
|---|---|---|
| `bg.canvas` | `#121316` | App background |
| `bg.surface` | `#1E2024` | Elevated sheets |
| `bg.card` | `#282A2F` | Chapter tiles, rows |
| `bg.pill` | `#2C2E33` | Selected filter pill |
| `bg.pillIdle` | transparent / hairline | Unselected pills |
| `text.primary` | `#FFFFFF` | Titles |
| `text.secondary` | `#9AA0A6` | Meta |
| `text.disabled` | `#5F6368` | Disabled |
| `accent.primary` | `#5B6CFF` | Play/pause, skip, links (screenshot blue/purple) |
| `accent.waveA` | `#7B8CFF` | Waveform line A |
| `accent.waveB` | `#7DDBA3` | Waveform line B |
| `accent.avatar` | `#3B82F6` | Account avatar |
| `accent.subject.chem` | `#2DD4BF` | Chemistry tile glyph tint |
| `state.error` | `#F87171` | Errors |
| `state.success` | `#34D399` | Success toasts |
| `overlay.scrim` | `#00000099` | Sheets |

Light mode: P2 — not required for MVP.

### Typography
- **Family:** `[ASSUMPTION: Expo Google Fonts — "DM Sans" for UI; "Space Grotesk" for display wordmark/headers.]` Avoid Inter/Roboto/system-default-only stacks for branded surfaces.
- **Scale:**
  - Display: 28 / Semibold
  - Title: 20 / Semibold
  - Body: 16 / Regular
  - Meta: 13 / Regular
  - Label: 12 / Medium (pills, speed)

### Spacing
- 4-pt grid: 4, 8, 12, 16, 20, 24, 32, 40.
- Screen horizontal padding: 16.
- List row min height: 72.
- Section gap: 24.

### Radius / Shadows / Icons
- Radius: pill `999`; card `16`; sheet top `20`; button `14`; icon button circle.
- Shadows: minimal on dark; prefer elevation via surface color, not heavy multi-layer shadows.
- Icons: thin-line (Feather / custom); raise-hand custom glyph (hand + motion lines).

## Components

### Buttons
- **Primary solid:** white fill / dark text for bottom CTAs (“Start podcast”, “Create”-style).
- **Primary accent:** `accent.primary` fill for Player play/pause.
- **Icon circle:** 40–48 outline or filled dark; used for Play / Raise hand on rows.
- **Text button:** secondary actions (Resend OTP).

### Inputs
- Dark filled fields (`bg.card`); 14 radius; clear focus ring `accent.primary`.
- OTP segmented inputs.
- Multilevel context textarea in sheet.

### Cards / Lists
- **ChapterTile:** image 40–48 square rounded 10 | title + meta | play circle. Not a heavy bordered “dashboard card” — single subtle surface.
- **PodRow:** icon | title + duration/progress + meta | raise-hand + play.
- Avoid card-in-card clutter; one job per section.

### Navigation
- **FilterPills:** All / MyPods / Learning Path.
- **BottomTabs:** Home / MyPods / Account — active icon on white pill background (screenshot Studio treatment).
- **Stack headers:** back, title truncate, optional actions.

### Dialogs / Sheets
- Start Podcast sheet; Raise-hand sheet; Logout confirm dialog.
- Host selector as segmented control inside sheet.
- **AskTutorComposer (shared):** ChatGPT-style dark capsule bar
  - Idle: text field + mic icon + circular primary (waveform when empty / send arrow when draft text)
  - Recording: X | animated live bars | stop square | blue send arrow
  - Uses `colors.card` / `colors.accent` / `radius.pill`; touch targets ≥ 44
- **UPDATED — LoginSoftPrompt (S014):** bottom sheet / modal on dark `bg.surface`:
  - Title variants: “Sign in to listen” / “Sign in to start a podcast” / “Sign in to choose a learning path”
  - Body one short line; primary white CTA “Sign in”; text secondary “Not now”
  - No audio preview behind the gate

### Guest empty / gated surfaces
- **MyPods / Learning Path / Account (guest):** centered EmptyState + primary Sign in (same CTA style as Create/Start pill).
- **Home All (guest):** full tile list; Play/Start still visible but route to soft-prompt (do not hide play icon — discovery OK).

### Loading / Empty / Error
- Skeleton tiles/rows on dark shimmer.
- Empty: short sentence + primary CTA.
- Error: inline banner + Retry.
- Generating: centered spinner + status copy.

## Motion (intentional, 2–3+)
1. Pill selection background morph (120–180ms).
2. Waveform gentle phase animation while playing.
3. Raise-hand sheet spring present; answer fade-in; recording waveform phase while mic open.
4. Optional: play button scale on press.

Respect `prefers-reduced-motion`: static waveform, instant sheet.

## Component architecture

```text
App
 ├── navigation/
│   ├── RootNavigator
│   ├── AuthStack
│   └── MainTabs (Home | MyPods | Account)
├── screens/
│   ├── SplashScreen
│   ├── OnboardingScreen
│   ├── LoginScreen
│   ├── OtpScreen
│   ├── HomeScreen
│   ├── MyPodsScreen
│   ├── LearningPathScreen
│   ├── PlayerScreen
│   └── AccountScreen
├── components/
│   ├── FilterPills
│   ├── ChapterTile
│   ├── PodRow
│   ├── HostCountSelector
│   ├── ContextComposer
│   ├── StartPodcastSheet
│   ├── RaiseHandSheet
│   ├── AskTutorComposer          # ChatGPT-style voice+text bar (idle / recording)
│   ├── LoginSoftPrompt          # NEW — listen / learning-path gate
│   ├── Waveform
│   ├── PlayerControls
│   ├── SeekBar
│   ├── EmptyState
│   ├── ErrorBanner
│   └── Skeleton
├── auth/
│   ├── pendingAction store      # NEW — resume after login
│   └── requireAuthForAction()
└── theme/
    ├── tokens
    ├── typography
    └── ThemeProvider
```

## Responsive behavior
- Phone-first (360–430 width).
- Tablets: constrain content max width ~600 centered; tiles remain single-column list for familiarity. `[ASSUMPTION: no multi-column catalog in MVP.]`
- Safe areas respected (notch, home indicator).
- Dynamic type: titles clamp 1–2 lines with ellipsis; meta may wrap to 2 lines.

## Accessibility
- Contrast: primary text on canvas ≥ WCAG AA.
- Touch targets ≥ 44×44 (play/raise-hand ≥ 48).
- Screen reader labels for all icon-only controls.
- Do not convey state by color alone (selected pill also uses weight/indicator).
