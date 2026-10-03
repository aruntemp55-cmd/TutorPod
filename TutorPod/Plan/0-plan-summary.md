# Tutor Pod — Plan Summary

**Status:** Plan **v2** (Admin + Section + PDF/chapters + streamed podcast) · Phase 7+ MVP evolving in `apps/`

## Product in one line

Students pick **Standard → Section → Chapter** (API-loaded dropdowns), start a multi-host podcast streamed from the server, and raise a hand (audio pauses) for AI Q&A. **Admins** manage catalog, upload PDFs, and generate/edit chapters in the same app.

## Auth

| Role | Rules |
|---|---|
| **Guest** | Browse catalog metadata; Play/Start/Learning Path soft-prompt login |
| **Student** | Login to listen, MyPods, Learning Path select, raise-hand |
| **Admin** | Same login; **Admin Screen is default** after login; CRUD Standard/Section, PDF upload, generate/edit/delete chapters |

## Student UX (NotebookLM-like)

- Dark Studio UI; podcast player (waveform, ±10, speed, like/dislike)
- Dropdowns: Standard → Section → Chapter from API
- Host count 2–4 sent with start-podcast request
- Audio **streamed from server** (`GET /pods/:id/audio`)
- Raise-hand: **pause** → question → AI answer → resume

## Admin UX

1. CRUD Standard  
2. CRUD Section (under Standard)  
3. Upload PDF per Standard + Section  
4. Generate chapters from PDF (pipeline; stub OK)  
5. Edit / delete chapters  

## AI / content assumptions

| Capability | MVP | Full |
|---|---|---|
| PDF → chapters | Stub extractor (page/heuristic titles) if no parser key | Real PDF parse + LLM chapter split |
| Podcast audio | Server caches/streams seeded or generated file | Multi-host TTS |
| Raise-hand Q&A | Stubbable LLM adapter (online) | Production LLM + citations |

## Stack

- Mobile: React Native + Expo  
- API: Node/TS + Fastify + Postgres + local file storage for PDF/audio `[ASSUMPTION]`

## Gate / deferred

- Real TTS multi-host, production LLM, Maestro E2E, Sentry — still open  
- See `6-implementation-plan.md` Sprint Admin-v2 tasks  
