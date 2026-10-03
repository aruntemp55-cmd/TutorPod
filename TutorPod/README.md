# Tutor Pod

Listen-first mobile tutor: **login-first** student app with Main tiles (Search, Ask any question, My Pods, **Learning Path**, Subjects → topics → podcasts). Admins manage catalog/PDFs in the same app.

**Repo path:** `/Users/anambuk/Documents/SeyonGitHub/TutorPodRepo/TutorPod`

## Credentials (dev)

| Role | Email | OTP |
|---|---|---|
| **Admin** | `admin@tutorpod.local` | `000000` |
| **Student** | any other email | `000000` |

## Auth & navigation (v3)

1. App opens on **Login**
2. Student OTP → **Settings** until **Name** + **Standard** are set
3. Then **Main** tiles: Search · Ask any question · My Pods · **Learning Path** · subject tiles
4. **Settings** (from Main or the first-time gate) always includes **Log out** → Login
5. Learning Path → pick a path → topic → Start podcast; or Subject → topic tiles → Start podcast (**host default 2**) → Player
6. Ask any question / Raise hand (Player modal) → voice+text composer. Voice needs `OPENAI_API_KEY` (Whisper); without it, **type instead**. Ask/Q&A stubs without a key.
7. Admin OTP → **Admin** screen

Dark/Light/System appearance lives on **Settings**.

OTP: non-production stub **`000000`**. Production must not accept the stub and does not yet send SMS/email (ops remaining). **Do not commit API keys.**

See [`Plan/docs/student-main-v3.md`](Plan/docs/student-main-v3.md) and [`Plan/docs/ai-providers.md`](Plan/docs/ai-providers.md).

## Setup & run

```bash
psql -d postgres -c "CREATE DATABASE tutorpod;"   # once
cd /Users/anambuk/Documents/SeyonGitHub/TutorPodRepo/TutorPod
cp apps/api/.env.example apps/api/.env            # set DATABASE_URL
npm run setup                                     # install + migrate + seed
npm run api                                       # :4010
npm run mobile                                    # Expo — Login first
```

iOS Simulator: `cd apps/mobile && npx expo start --ios`

## Tests

```bash
npm run ci
npm run api:test
npm run mobile:lint
npm run mobile:test
```

## Maestro (local; **not** on GitHub CI)

```bash
npm run maestro:critical
# Login → Main → subject → Start podcast → Player → Raise hand
```

See [`Plan/docs/sprint4-raise-path-e2e.md`](Plan/docs/sprint4-raise-path-e2e.md).
