/**
 * Ask-flow speech-to-text — OpenAI Whisper when keyed; explicit failure otherwise
 * (no fake transcript — student should type).
 */

import {
  isOpenAIConfigured,
  logAiMode,
  transcribeSpeech,
} from "./openaiClient.js";

export type TranscribeInput = {
  buffer: Buffer;
  filename: string;
  mimeType: string;
};

export type TranscribeResult = {
  transcript: string;
  provider: "openai" | "mock";
};

export class SttError extends Error {
  constructor(
    public code: "STT_UNAVAILABLE" | "STT_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "SttError";
  }
}

export type TranscribeFn = (input: TranscribeInput) => Promise<string>;

let override: TranscribeFn | null = null;

/** Test hook — inject a mock Whisper path. */
export function setTranscribeImpl(fn: TranscribeFn | null) {
  override = fn;
}

export function resetTranscribeImpl() {
  override = null;
}

export async function transcribeAudio(
  input: TranscribeInput,
): Promise<TranscribeResult> {
  if (override) {
    const transcript = (await override(input)).trim();
    if (!transcript) {
      throw new SttError("STT_FAILED", "Could not hear a question. Try again.");
    }
    return { transcript, provider: "mock" };
  }

  const useOpenAI = isOpenAIConfigured();
  logAiMode("ask-stt", useOpenAI);
  if (!useOpenAI) {
    throw new SttError(
      "STT_UNAVAILABLE",
      "Speech-to-text needs OPENAI_API_KEY. Type your question instead.",
    );
  }

  try {
    const transcript = (
      await transcribeSpeech(input.buffer, input.filename, input.mimeType)
    ).trim();
    if (!transcript) {
      throw new SttError(
        "STT_FAILED",
        "Could not hear a question. Try again or type it.",
      );
    }
    return { transcript, provider: "openai" };
  } catch (e) {
    if (e instanceof SttError) throw e;
    console.warn(
      "[ai] ask STT failed:",
      e instanceof Error ? e.message : e,
    );
    throw new SttError(
      "STT_FAILED",
      "Could not transcribe audio. Type your question instead.",
    );
  }
}
