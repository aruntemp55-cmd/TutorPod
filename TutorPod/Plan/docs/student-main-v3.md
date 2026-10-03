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
