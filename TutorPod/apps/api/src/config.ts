import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4010),
  databaseUrl:
    process.env.DATABASE_URL ?? "postgres://localhost:5432/tutorpod",
  jwtSecret: process.env.JWT_SECRET ?? "tutorpod-dev-secret",
  /** Non-prod OTP. Production never issues or accepts this stub. */
  otpStubCode: process.env.OTP_STUB_CODE ?? "000000",
  nodeEnv: process.env.NODE_ENV ?? "development",
  podGenerateDelayMs: Number(process.env.POD_GENERATE_DELAY_MS ?? 350),
  sampleAudioUrl:
    process.env.SAMPLE_AUDIO_URL ??
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:4010",
  accessTtlSec: 60 * 15,
  refreshTtlSec: 60 * 60 * 24 * 30,

  /** OpenAI — when unset, LLM/TTS/PDF-chapter paths use stubs. */
  openaiApiKey: (process.env.OPENAI_API_KEY ?? "").trim(),
  openaiBaseUrl: (
    process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"
  ).replace(/\/$/, ""),
  openaiChatModel: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
  openaiTtsModel: process.env.OPENAI_TTS_MODEL ?? "tts-1",
  openaiSttModel: process.env.OPENAI_STT_MODEL ?? "whisper-1",
  /** Comma-separated TTS voices for hosts 1..n (OpenAI: alloy,echo,fable,onyx,nova,shimmer) */
  openaiTtsVoices: (
    process.env.OPENAI_TTS_VOICES ?? "alloy,nova,echo,onyx"
  )
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean),

  /** Share / deep links (metadata only). */
  deepLinkBase: (process.env.DEEP_LINK_BASE ?? "https://tutorpod.app").replace(
    /\/$/,
    "",
  ),
};

export function isOpenAIConfigured() {
  // Prefer live env so tests / runtime can toggle without reloading config
  const live = (process.env.OPENAI_API_KEY ?? config.openaiApiKey).trim();
  return live.length > 0;
}

export function openaiApiKey(): string {
  return (process.env.OPENAI_API_KEY ?? config.openaiApiKey).trim();
}
