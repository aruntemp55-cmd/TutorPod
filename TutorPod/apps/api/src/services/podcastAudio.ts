/**
 * Multi-host podcast audio: LLM script → per-host TTS → concatenated MP3.
 * Falls back to sample/cached seed audio when OPENAI_API_KEY is missing.
 */

import { copyFileSync } from "node:fs";
import { config } from "../config.js";
import {
  audioPath,
  ensureCachedAudio,
  ensureStorage,
  mirrorToRemote,
  writeLocalAndMaybeRemote,
} from "../storage.js";
import {
  chatCompletion,
  isOpenAIConfigured,
  logAiMode,
  textToSpeech,
  voiceForHost,
} from "./openaiClient.js";

export type PodcastLine = { host: number; text: string };

export type PodcastGenerateInput = {
  /** Storage key without extension (e.g. chapterId-hostCount or podId) */
  storageKey: string;
  chapterTitle: string;
  synopsis: string | null;
  contextText: string | null;
  hostCount: number;
  /** Fallback remote/sample URL when OpenAI unavailable */
  fallbackSourceUrl: string;
};

export type PodcastGenerateResult = {
  absolutePath: string;
  storageRel: string;
  durationSec: number;
  provider: "openai" | "stub";
  title?: string;
};

type ScriptResult = { title: string; lines: PodcastLine[] };

let scriptImpl: ((input: PodcastGenerateInput) => Promise<ScriptResult>) | null =
  null;
let ttsImpl:
  | ((text: string, voice: string) => Promise<Buffer>)
  | null = null;

/** Test helpers */
export function setPodcastScriptImpl(
  fn: ((input: PodcastGenerateInput) => Promise<ScriptResult>) | null,
) {
  scriptImpl = fn;
}
export function setPodcastTtsImpl(
  fn: ((text: string, voice: string) => Promise<Buffer>) | null,
) {
  ttsImpl = fn;
}

async function buildScript(input: PodcastGenerateInput): Promise<ScriptResult> {
  if (scriptImpl) return scriptImpl(input);

  const raw = await chatCompletion(
    [
      {
        role: "system",
        content:
          "You write short multi-host educational podcast scripts for high school. " +
          'Return JSON: { "title": string, "lines": [ { "host": number, "text": string } ] }. ' +
          "Hosts are numbered from 1. Keep total spoken words under 450. Conversational, accurate.",
      },
      {
        role: "user",
        content: [
          `Hosts: ${input.hostCount}`,
          `Chapter: ${input.chapterTitle}`,
          input.synopsis ? `Synopsis: ${input.synopsis}` : null,
          input.contextText ? `Student focus: ${input.contextText}` : null,
          "Cover the core ideas as a dialogue between the hosts.",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    { json: true, temperature: 0.6 },
  );

  const parsed = JSON.parse(raw) as {
    title?: string;
    lines?: { host?: number; text?: string }[];
  };
  const lines = (parsed.lines ?? [])
    .map((l) => ({
      host: Math.min(
        input.hostCount,
        Math.max(1, Number(l.host) || 1),
      ),
      text: String(l.text ?? "").trim(),
    }))
    .filter((l) => l.text.length > 0);
  if (!lines.length) throw new Error("Empty podcast script");
  return {
    title: String(parsed.title ?? input.chapterTitle).trim(),
    lines,
  };
}

function estimateDurationSec(mp3: Buffer): number {
  // Rough: ~16 KB/s for typical 128kbps MP3
  return Math.max(15, Math.round(mp3.length / 16000));
}

async function synthesizeLines(lines: PodcastLine[]): Promise<Buffer> {
  const parts: Buffer[] = [];
  for (const line of lines) {
    const voice = voiceForHost(line.host);
    const chunk = ttsImpl
      ? await ttsImpl(line.text, voice)
      : await textToSpeech(line.text, voice);
    parts.push(chunk);
  }
  return Buffer.concat(parts);
}

/**
 * Produce a streamable MP3 under storage/audio.
 * With OpenAI: unique file per storageKey from TTS.
 * Without: cache/sample fallback (existing stub behavior).
 */
export async function generatePodcastAudio(
  input: PodcastGenerateInput,
): Promise<PodcastGenerateResult> {
  const useOpenAI = isOpenAIConfigured() || !!scriptImpl;
  logAiMode("podcast TTS", isOpenAIConfigured() || !!scriptImpl);

  if (!useOpenAI && !scriptImpl) {
    // Stable sample cache, then copy to per-pod key for streaming
    const shared = await ensureCachedAudio(
      "sample-fallback",
      input.fallbackSourceUrl || config.sampleAudioUrl,
    );
    ensureStorage();
    const storageRel = `${input.storageKey}.mp3`;
    const absolutePath = audioPath(storageRel);
    copyFileSync(shared, absolutePath);
    try {
      await mirrorToRemote("audio", storageRel);
    } catch {
      /* local OK */
    }
    return {
      absolutePath,
      storageRel,
      durationSec: 1482,
      provider: "stub",
    };
  }

  try {
    const script = await buildScript(input);
    const mp3 = await synthesizeLines(script.lines);
    const storageRel = `${input.storageKey}.mp3`;
    const absolutePath = await writeLocalAndMaybeRemote(
      "audio",
      storageRel,
      mp3,
    );
    return {
      absolutePath,
      storageRel,
      durationSec: estimateDurationSec(mp3),
      provider: scriptImpl || ttsImpl ? "openai" : "openai",
      title: script.title,
    };
  } catch (e) {
    console.warn(
      "[ai] podcast OpenAI path failed; falling back to sample audio:",
      e instanceof Error ? e.message : e,
    );
    const shared = await ensureCachedAudio(
      "sample-fallback",
      input.fallbackSourceUrl || config.sampleAudioUrl,
    );
    ensureStorage();
    const storageRel = `${input.storageKey}.mp3`;
    const absolutePath = audioPath(storageRel);
    copyFileSync(shared, absolutePath);
    try {
      await mirrorToRemote("audio", storageRel);
    } catch {
      /* local OK */
    }
    return {
      absolutePath,
      storageRel,
      durationSec: 1482,
      provider: "stub",
    };
  }
}
