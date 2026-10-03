# API & Data Contracts — Tutor Pod

## Data model

```text
User
 ├── Profile (name, standardId)
 ├── LearningPathSelection[] (per subject)
 ├── Pod[] (MyPods)
 │    ├── AudioAsset
 │    ├── Progress
 │    ├── Reaction (like|dislike)
 │    └── Question[] (raise-hand)
 └── Session

Catalog
 ├── Standard
 │    └── Subject
 │         ├── Chapter (imageUrl, …)
 │         └── LearningPath
 │              └── LearningPathItem (ordered Chapter refs)
 └── SeedAudioVariant (chapter × hostCount → audio) [MVP]
```

### Entities

#### User
| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | yes | PK |
| email | string | yes | unique |
| name | string | yes | display |
| standardId | uuid | yes | FK Standard |
| createdAt | datetime | yes | |

#### Standard
| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | yes | |
| code | string | yes | e.g. `CBSE-12` |
| name | string | yes | e.g. Class 12 |
| board | string | yes | e.g. CBSE |

#### Subject
| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | yes | |
| standardId | uuid | yes | FK |
| name | string | yes | e.g. Chemistry |
| slug | string | yes | |

#### Chapter
| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | yes | |
| subjectId | uuid | yes | FK |
| title | string | yes | |
| synopsis | string | no | |
| imageUrl | string | yes | tile photo |
| sortOrder | int | yes | |
| sourceCount | int | no | display meta; default 1 |

#### LearningPath
| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | yes | |
| subjectId | uuid | yes | |
| name | string | yes | |
| description | string | no | |

#### LearningPathItem
| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | yes | |
| learningPathId | uuid | yes | |
| chapterId | uuid | yes | |
| position | int | yes | 1-based order |

#### LearningPathSelection
| Field | Type | Required | Notes |
|---|---|---|---|
| userId | uuid | yes | |
| subjectId | uuid | yes | unique pair with user |
| learningPathId | uuid | yes | |
| updatedAt | datetime | yes | |

#### Pod
| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | yes | |
| userId | uuid | yes | owner |
| chapterId | uuid | yes | |
| title | string | yes | may derive from chapter + variant |
| hostCount | int | yes | 2–4 |
| contextText | string | no | max 2000 |
| status | enum | yes | `queued` \| `generating` \| `ready` \| `failed` |
| audioUrl | string | no | when ready |
| durationSec | int | no | |
| errorMessage | string | no | |
| createdAt | datetime | yes | |
| readyAt | datetime | no | |

#### PodProgress
| Field | Type | Required | Notes |
|---|---|---|---|
| podId | uuid | yes | PK/FK |
| userId | uuid | yes | |
| positionSec | float | yes | |
| updatedAt | datetime | yes | |

#### PodReaction
| Field | Type | Required | Notes |
|---|---|---|---|
| podId | uuid | yes | |
| userId | uuid | yes | unique (pod,user) |
| value | enum | yes | `like` \| `dislike` |
| updatedAt | datetime | yes | |

#### Question
| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | yes | |
| podId | uuid | yes | |
| userId | uuid | yes | |
| questionText | string | yes | max 1000 |
| answerText | string | no | |
| status | enum | yes | `pending` \| `answered` \| `failed` |
| createdAt | datetime | yes | |
| answeredAt | datetime | no | |

#### SeedAudioVariant `[ASSUMPTION: MVP catalog of prebuilt audio]`
| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | yes | |
| chapterId | uuid | yes | |
| hostCount | int | yes | 2–4 |
| audioUrl | string | yes | |
| durationSec | int | yes | |
| title | string | yes | display title override |

## API contracts

Base: `/api/v1` · JSON · HTTPS  
Auth: `Authorization: Bearer <accessToken>` unless noted.

### Auth policy (UPDATED)
| Surface | Auth |
|---|---|
| Catalog browse (`GET /catalog/standards`, subjects, chapters metadata) | **Optional / none** — guest OK |
| Learning path **catalog list** (`GET …/learning-paths`) | **Required** — create/select flows need auth; listing paths for selection is auth-gated `[ASSUMPTION: no public path teaser API]` |
| Learning path **selection** (`PUT/GET /me/learning-paths*`) | **Required** |
| Pods create/list/detail/status, progress, reaction, questions | **Required** (listen session) |
| Audio URLs on pod payloads | **Required** — never return playable `audioUrl` to anonymous clients |

`401 UNAUTHORIZED` on gated endpoints; mobile maps to soft-prompt (S014) + resume.

### POST /auth/otp/request
- **Auth:** none
- **Request:** `{ "email": "student@example.com" }`
- **Response:** `{ "ok": true, "expiresInSec": 300 }`
- **Errors:** `400` invalid email; `429` rate limit

### POST /auth/otp/verify
- **Auth:** none
- **Request:** `{ "email": "…", "code": "123456" }`
- **Response:** `{ "accessToken": "…", "refreshToken": "…", "user": { "id", "email", "name", "standardId" } }`
- **Errors:** `401` invalid; `429` rate limit

### POST /auth/refresh
- **Auth:** refresh token body
- **Request:** `{ "refreshToken": "…" }`
- **Response:** `{ "accessToken": "…", "refreshToken": "…" }`
- **Errors:** `401`

### POST /auth/logout
- **Auth:** required
- **Request:** `{ "refreshToken": "…" }` optional revoke
- **Response:** `{ "ok": true }`

### GET /me
- **Auth:** required
- **Response:** User profile + standard summary

### PATCH /me
- **Auth:** required
- **Request:** `{ "name"?: string, "standardId"?: uuid }`
- **Response:** updated User
- **Errors:** `400` validation

### GET /catalog/standards
- **Auth:** **none** (UPDATED — guest browse)
- **Response:** `{ "items": Standard[] }`

### GET /catalog/standards/:standardId/subjects
- **Auth:** **none** (UPDATED — guest browse)
- **Response:** `{ "items": Subject[] }`

### GET /catalog/subjects/:subjectId/chapters
- **Auth:** **none** for default chapter list (UPDATED — guest browse tiles)
- **Query:** `pathId?` — if set, **Auth required** (path-ordered list is part of Learning Path experience)
- **Response:** `{ "items": Chapter[] }` — metadata + `imageUrl` only; **no** audio URLs
- **Errors:** `401` when `pathId` present without auth

### GET /catalog/subjects/:subjectId/learning-paths
- **Auth:** **required** (UPDATED — selecting/browsing paths to choose requires login)
- **Response:** `{ "items": LearningPath[] }`
- **Errors:** `401`

### GET /catalog/learning-paths/:pathId
- **Auth:** **required**
- **Response:** LearningPath + ordered chapters
- **Errors:** `401`

### PUT /me/learning-paths/:subjectId
- **Auth:** **required** (create/select Learning Path)
- **Request:** `{ "learningPathId": "uuid" }`
- **Response:** LearningPathSelection
- **Errors:** `401`; `404` path not in subject

### GET /me/learning-paths
- **Auth:** **required**
- **Response:** `{ "items": LearningPathSelection[] }`
- **Errors:** `401`

### POST /pods
- **Auth:** **required** (listen / start podcast)
- **Request:**
```json
{
  "chapterId": "uuid",
  "hostCount": 3,
  "contextText": "Focus on mechanisms and named reactions"
}
```
- **Response:** Pod (`status` queued/generating/ready)
- **Errors:** `400` hosts; `404` chapter; `429` quota
- **MVP behavior:** Resolve `SeedAudioVariant` for chapter×hostCount when present → `ready` immediately; else enqueue stub job that attaches default variant or fails clearly.

### GET /pods
- **Auth:** **required** (MyPods / listen library)
- **Query:** `cursor`, `limit` (default 20); `status?`
- **Response:** `{ "items": PodListItem[], "nextCursor": "…" }`  
  `PodListItem` includes progress snapshot, `reaction`, chapter meta, `audioUrl` when ready.
- **Errors:** `401`

### GET /pods/:podId
- **Auth:** **required** (owner) — playable session
- **Response:** Pod detail + progress + reaction + `audioUrl` when ready
- **Errors:** `401` / `403`

### GET /pods/:podId/status
- **Auth:** **required** (owner)
- **Response:** `{ "id", "status", "audioUrl?", "durationSec?", "errorMessage?" }`  
  Used for polling while generating. `[ASSUMPTION: poll every 2s; WebSocket P2.]`
- **Errors:** `401`

### PUT /pods/:podId/progress
- **Auth:** **required** (owner)
- **Request:** `{ "positionSec": 95.2 }`
- **Response:** `{ "ok": true, "positionSec": 95.2 }`
- **Errors:** `401`

### PUT /pods/:podId/reaction
- **Auth:** **required** (owner)
- **Request:** `{ "value": "like" | "dislike" | null }` (`null` clears)
- **Response:** `{ "value": "like" | "dislike" | null }`
- **Errors:** `401`

### POST /pods/:podId/questions
- **Auth:** **required** (owner)
- **Request:** `{ "questionText": "Why does nucleophilic addition…?" }`
- **Response:** Question (`pending` then client may poll, or wait for sync answer)
- **MVP:** `[ASSUMPTION: synchronous HTTP wait up to 25s returning answered|failed; client timeout 30s.]`
- **Voice path (client):** record audio → `POST /api/v1/ask/transcribe` → use `transcript` as `questionText` here. No separate raise-hand upload endpoint.
- **Errors:** `401`; `400` empty; `429`; `503` AI unavailable

### GET /pods/:podId/questions
- **Auth:** **required** (owner)
- **Query:** `limit` default 20
- **Response:** `{ "items": Question[] }` newest first
- **Errors:** `401`

### POST /api/v1/ask
- **Auth:** required
- **Request:** `{ "message": string, "history"?: { role, content }[] }`
- **Response:** `{ "answer": string, "provider": "openai" | "stub" }`
- **Errors:** `401`; `400`; `429`; `503 AI_UNAVAILABLE`

### POST /api/v1/ask/transcribe
- **Auth:** required
- **Request:** multipart form field `file` (audio; max 10MB; m4a/mp3/wav/webm/…)
- **Response:** `{ "transcript": string, "provider": "openai" | "mock" }`
- **Behavior:** OpenAI Whisper when `OPENAI_API_KEY` set; otherwise `503 STT_UNAVAILABLE` (no fake transcript — student types). Used by **Ask** and **Raise-hand** composers.
- **Errors:** `401`; `400` validation; `503 STT_UNAVAILABLE` | `STT_FAILED`

## Cross-cutting
- **Pagination:** Cursor-based on `/pods`.
- **Sorting:** MyPods default `createdAt desc`; chapters by `sortOrder` or path position.
- **Filtering:** pods by status; chapters by subject / path.
- **Search (P1):** `GET /search?q=&scope=chapters|pods` — chapters guest OK; pods scope requires auth.
- **AuthN:** OTP + JWT access (short) + refresh (long). `[ASSUMPTION: access 15m, refresh 30d.]`
- **AuthZ (UPDATED):** Guest = catalog chapter browse only. Authenticated = pods/audio/progress/reactions/Q&A + learning-path select. Owner-only for pod-scoped resources. Signed/expiring audio URLs preferred. `[ASSUMPTION: CDN signed URLs short TTL.]`
- **Error codes:** `400`, `401`, `403`, `404`, `409`, `429`, `500`, `503` with body `{ "error": { "code", "message" } }`.
- **Retry:** Idempotent GETs safe; POST /pods not idempotent without client key — `[ASSUMPTION: optional Idempotency-Key header.]`
- **Offline:** Progress updates queue locally (auth); start pod + Q&A require network + auth.

## AI / content pipeline notes
- **MVP:** Seed audio + LLM Q&A with chapter title/synopsis (+ contextText) in system prompt; no RAG corpus required beyond seed text fields.
- **Full:** Job worker generates multi-host script → TTS per host → mix → store audio → mark pod ready; optional RAG over chapter source docs.

## API ↔ Screen mapping

| Screen | API | Purpose |
|---|---|---|
| S003/S004 | POST /auth/otp/* | Login (+ resume) |
| S005 | GET catalog standards/subjects/chapters (no auth) | Guest/auth browse |
| S014 | — (client gate) → auth | Soft-prompt before listen/path |
| S006/S007 | POST /pods, GET /pods/:id/status (**auth**) | Start & wait |
| S008 | GET /pods/:id, PUT progress, PUT reaction (**auth**) | Player listen |
| S009 | GET learning-paths, PUT me/learning-paths/:subjectId (**auth**) | Path create/select |
| S010 | GET /pods (**auth**) | MyPods listen library |
| S011 | POST/GET …/questions (**auth**); voice via POST /ask/transcribe | Raise-hand text+voice |
| S027 Ask | POST /ask; POST /ask/transcribe | Standalone ask chat+voice |
| S012 | GET/PATCH /me, POST logout (**auth**) | Account |
