# AI providers — Tutor Pod

**Provider:** OpenAI when `OPENAI_API_KEY` is set (chat, Whisper STT, TTS).  
Without a key, paths **must not crash**: stub Q&A/Ask, `503 STT_UNAVAILABLE` (type instead), sample podcast audio. Local/CI work offline. **Never commit real keys.**

| Feature | With `OPENAI_API_KEY` | Without key |
|---|---|---|
| Raise-hand / Ask Q&A | Chat Completions (`OPENAI_CHAT_MODEL`, default `gpt-4o-mini`) | Heuristic stub answer |
| Ask / raise-hand voice STT | Whisper via `POST /api/v1/ask/transcribe` | `503 STT_UNAVAILABLE` — client: “Voice needs an API key. Type your question instead.” |
| PDF → chapters | `pdf-parse` + chat JSON outline | Filename/section heuristic units |
| Podcast audio | LLM dialogue → per-host TTS → MP3 | Cached sample / seed MP3 |

## Env vars (`apps/api/.env`)

Copy `apps/api/.env.example`. Set `OPENAI_API_KEY` locally if you want live AI. Leave empty for stubs. **Do not paste keys into docs or logs.**

Optional: `OPENAI_CHAT_MODEL`, `OPENAI_TTS_MODEL`, `OPENAI_STT_MODEL`, `OPENAI_TTS_VOICES`, `OPENAI_BASE_URL`.

## OTP (related)

Non-production: `OTP_STUB_CODE=000000` (Maestro). Production: random code, stub rejected; **email/SMS delivery is remaining ops work** (code is stored, not sent).

## Manual smoke (keys set)

1. `cp apps/api/.env.example apps/api/.env` and set `OPENAI_API_KEY` (local only).
2. `npm run api` — look for logs `[ai] …: OpenAI` (key value is not logged).
3. **Q&A:** Student login → start/play pod → Raise hand → type or voice → non-stub answer; Resume listening.
4. **PDF chapters:** Admin → upload PDF → Generate chapters (`stub: false` when keyed).
5. **Podcast TTS:** Start podcast → Player; file under `apps/api/storage/audio/<podId>.mp3` should be synthesized when keyed.

## Fallback logging

Console: `[ai] <feature>: stub fallback (set OPENAI_API_KEY to enable)` or  
`[ai] <feature> OpenAI failed; using stub: …`
