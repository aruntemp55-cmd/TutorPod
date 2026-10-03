import { config, isOpenAIConfigured, openaiApiKey } from "../config.js";

export { isOpenAIConfigured };

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export class OpenAIError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "OpenAIError";
  }
}

async function openaiFetch(
  path: string,
  init: RequestInit & { parseJson?: boolean } = {},
): Promise<Response> {
  if (!isOpenAIConfigured()) {
    throw new OpenAIError("OPENAI_API_KEY is not configured");
  }
  const { parseJson: _p, ...req } = init;
  const res = await fetch(`${config.openaiBaseUrl}${path}`, {
    ...req,
    headers: {
      Authorization: `Bearer ${openaiApiKey()}`,
      ...(req.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new OpenAIError(
      `OpenAI ${path} failed (${res.status}): ${body.slice(0, 400)}`,
      res.status,
    );
  }
  return res;
}

/** Chat completion — returns assistant text. */
export async function chatCompletion(
  messages: ChatMessage[],
  opts: { json?: boolean; temperature?: number } = {},
): Promise<string> {
  const res = await openaiFetch("/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.openaiChatModel,
      messages,
      temperature: opts.temperature ?? 0.4,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new OpenAIError("Empty chat completion");
  return content;
}

/** Whisper STT — returns transcript text. */
export async function transcribeSpeech(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<string> {
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(buffer)], {
      type: mimeType || "audio/mp4",
    }),
    filename || "audio.m4a",
  );
  form.append("model", config.openaiSttModel);
  const res = await openaiFetch("/audio/transcriptions", {
    method: "POST",
    body: form,
  });
  const data = (await res.json()) as { text?: string };
  const text = data.text?.trim();
  if (!text) throw new OpenAIError("Empty transcription");
  return text;
}

/** TTS — returns MP3 buffer. */
export async function textToSpeech(
  text: string,
  voice: string,
): Promise<Buffer> {
  const res = await openaiFetch("/audio/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.openaiTtsModel,
      voice,
      input: text.slice(0, 4096),
      response_format: "mp3",
    }),
  });
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

export function voiceForHost(hostIndex1Based: number): string {
  const voices = config.openaiTtsVoices.length
    ? config.openaiTtsVoices
    : ["alloy"];
  return voices[(hostIndex1Based - 1) % voices.length] ?? "alloy";
}

export function logAiMode(feature: string, usingOpenAI: boolean) {
  if (usingOpenAI) {
    console.info(`[ai] ${feature}: OpenAI (${config.openaiChatModel})`);
  } else {
    console.info(`[ai] ${feature}: stub fallback (set OPENAI_API_KEY to enable)`);
  }
}
