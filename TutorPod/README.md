# Tutor Pod

Listen-first mobile tutor: **login-first** student app with Main tiles (Search, Ask any question, My Pods, Subjects → topics → podcasts). Admins manage catalog/PDFs in the same app.

**Repo path:** `/Users/anambuk/Documents/SeyonGitHub/TutorPodRepo/TutorPod`

## Credentials (dev)

| Role | Email | OTP |
|---|---|---|
| **Admin** | `admin@tutorpod.local` | `000000` |
| **Student** | any other email | `000000` |

## Auth & navigation (v3)

1. App opens on **Login**
2. Student OTP → **Settings** until **Name** + **Standard** are set
3. Then **Main** tiles: Search · Ask any question · My Pods · subject tiles
4. Subject → topic tiles → Start podcast (**host default 2**) → Player
5. Ask any question → chat + voice → `POST /api/v1/ask/transcribe` (Whisper) → `POST /api/v1/ask`
6. Admin OTP → **Admin** screen

Dark/Light/System appearance lives on Settings (and Account).

See [`Plan/docs/student-main-v3.md`](Plan/docs/student-main-v3.md).

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
