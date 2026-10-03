# Student Main v3 — Login-first tile home

## Navigation map

```
Login ──OTP──► Admin? ──yes──► Admin
                 │
                 no
                 ▼
           profileComplete?
            │           │
           no          yes
            ▼           ▼
        Settings ───► Main (tiles)
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
      Search        Ask any question   My Pods
         │               ▼               ▼
         │          Ask chat+voice    MyPods list → Player
         │          (Whisper STT)
         │
         ▼
   Subject tiles (for Settings standard)
         ▼
   Topic tiles (chapters)
         ▼
   Start podcast (host default 2) → Generating → Player
```

## Mandatory settings
- **Student name** (non-empty)
- **Standard** (required UUID)

Until both are set, Main is blocked (Settings only).

## Ask voice STT
1. Mobile ChatGPT-style composer records audio → `POST /api/v1/ask/transcribe` (multipart `file`)
2. API uses OpenAI Whisper when `OPENAI_API_KEY` is set
3. Without key / on failure → `503 STT_UNAVAILABLE` or `STT_FAILED` — type instead
4. **Ask:** transcript → `POST /api/v1/ask`
5. **Raise-hand (Player):** transcript → `POST /api/v1/pods/:id/questions` (audio paused while sheet open)

### Composer UX
- **Idle:** capsule — placeholder, mic, circular voice/send
- **Recording:** X cancel, live waveform, stop, blue send arrow
- Web: graceful mic unavailable / permission denied messaging (type still works)

## Credentials
| Role | Email | OTP |
|---|---|---|
| Admin | `admin@tutorpod.local` | `000000` |
| Student | any other email | `000000` |

## Run
```bash
cd /Users/anambuk/Documents/SeyonGitHub/TutorPodRepo/TutorPod
npm run api          # :4010
npm run mobile       # Expo — Login is first screen
```
