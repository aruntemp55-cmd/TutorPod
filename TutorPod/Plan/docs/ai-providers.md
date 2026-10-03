# AI providers — Tutor Pod

**Provider:** OpenAI (`OPENAI_API_KEY`) for chat + TTS.  
Without a key, all three paths keep the previous stub/sample behavior so `npm run ci` and local demos work offline.

| Feature | With `OPENAI_API_KEY` | Without key |
|---|---|---|
| Raise-hand Q&A | Chat Completions (`OPENAI_CHAT_MODEL`, default `gpt-4o-mini`) | Heuristic stub answer |
| PDF → chapters | `pdf-parse` text extract + chat JSON outline | Filename/section heuristic units |
| Podcast audio | LLM dialogue script → per-host TTS → concatenated MP3 in `storage/audio/` | Cached sample / seed variant MP3 |

## Env vars (`apps/api/.env`)

```bash
OPENAI_API_KEY=sk-...
OPENAI_CHAT_MODEL=gpt-4o-mini          # optional
OPENAI_TTS_MODEL=tts-1                 # optional
OPENAI_TTS_VOICES=alloy,nova,echo,onyx # optional host voices
# OPENAI_BASE_URL=https://api.openai.com/v1
```

See `apps/api/.env.example`. **Do not commit secrets.**

## Manual smoke (keys set)

1. `cp apps/api/.env.example apps/api/.env` and set `OPENAI_API_KEY`.
2. `npm run api` — look for logs `[ai] …: OpenAI`.
3. **Q&A:** Student login → start/play pod → Raise hand → ask a chemistry question → expect a non-stub answer.
4. **PDF chapters:** Admin login → upload PDF → Generate chapters → titles/synopses should reflect PDF content (`stub: false` in API response).
5. **Podcast TTS:** Student Start podcast → Generating → Player; audio file under `apps/api/storage/audio/<podId>.mp3` should be freshly synthesized (not only the SoundHelix sample).

## Fallback logging

Console: `[ai] <feature>: stub fallback (set OPENAI_API_KEY to enable)` or  
`[ai] <feature> OpenAI failed; using stub: …`
