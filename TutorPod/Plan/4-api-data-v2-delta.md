# API & Data — v2 delta (Admin / Section / PDF / Stream)

Supplements `4-api-data.md`. **Section** replaces Subject in product language.

## Model additions

```text
User.role: 'student' | 'admin'
Section  (was Subject)
SectionPdf { id, standardId, sectionId, filename, storagePath, uploadedAt }
Chapter  (+ optional sectionPdfId, generatedAt)
Pod request: { standardId, sectionId, chapterId, hostCount, contextText? }
Audio stream: GET /api/v1/pods/:podId/audio  (auth, owner) → audio/mpeg stream
```

## Admin endpoints (all require role=admin)

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/api/v1/admin/standards` | List / create |
| PATCH/DELETE | `/api/v1/admin/standards/:id` | Update / delete |
| GET/POST | `/api/v1/admin/standards/:standardId/sections` | List / create |
| PATCH/DELETE | `/api/v1/admin/sections/:id` | Update / delete |
| POST | `/api/v1/admin/sections/:sectionId/pdf` | multipart PDF upload |
| GET | `/api/v1/admin/sections/:sectionId/pdfs` | List PDFs |
| POST | `/api/v1/admin/sections/:sectionId/generate-chapters` | `{ pdfId }` → chapters |
| PATCH/DELETE | `/api/v1/admin/chapters/:id` | Edit / delete chapter |

## Student catalog (public browse)

- `GET /catalog/standards`
- `GET /catalog/standards/:id/sections` *(was …/subjects)*
- `GET /catalog/sections/:id/chapters` *(was …/subjects/…/chapters)*

## Podcast

- `POST /pods` body includes `standardId`, `sectionId`, `chapterId`, `hostCount`
- `GET /pods/:id/audio` streams bytes (`Accept-Ranges` when possible)
- Client player uses stream URL with Bearer token (or short-lived query token) `[ASSUMPTION: Authorization header via expo-av headers if supported; else signed query token]`

## Stubs

- PDF parse / chapter generate: heuristic stub titles from filename + page count proxy
- Audio: copy/cache sample MP3 to storage; stream that file
- Q&A: existing stub LLM adapter
