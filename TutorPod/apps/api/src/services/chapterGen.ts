/**
 * PDF → chapters: parse PDF text + OpenAI when configured; heuristic stub otherwise.
 */

import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import {
  chatCompletion,
  isOpenAIConfigured,
  logAiMode,
} from "./openaiClient.js";

const require = createRequire(import.meta.url);

export type GeneratedChapter = { title: string; synopsis: string };

export type GenerateChaptersResult = {
  chapters: GeneratedChapter[];
  stub: boolean;
  provider: "openai" | "stub";
};

/** Heuristic stub (no PDF parse / no LLM). */
export function generateChaptersFromPdfStub(input: {
  pdfName: string;
  sectionName: string;
  count?: number;
}): GeneratedChapter[] {
  const n = input.count ?? 5;
  const base = input.pdfName.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ");
  return Array.from({ length: n }, (_, i) => ({
    title: `${base || input.sectionName} — Unit ${i + 1}`,
    synopsis: `Auto-generated chapter ${i + 1} from uploaded PDF “${input.pdfName}” for ${input.sectionName}. [STUB — not real PDF parse]`,
  }));
}

export async function extractPdfText(absolutePath: string): Promise<string> {
  const buf = await readFile(absolutePath);
  try {
    // pdf-parse is CJS
    const pdfParse = require("pdf-parse") as (
      data: Buffer,
    ) => Promise<{ text: string }>;
    const parsed = await pdfParse(buf);
    return (parsed.text ?? "").replace(/\s+/g, " ").trim();
  } catch (e) {
    console.warn(
      "[ai] pdf-parse failed, using binary scrape:",
      e instanceof Error ? e.message : e,
    );
    // Last-resort: pull printable ASCII runs
    const raw = buf.toString("latin1");
    const runs = raw.match(/[\x20-\x7E]{4,}/g) ?? [];
    return runs.join(" ").slice(0, 20000);
  }
}

async function openaiChaptersFromText(input: {
  sectionName: string;
  pdfName: string;
  text: string;
  count: number;
}): Promise<GeneratedChapter[]> {
  const excerpt = input.text.slice(0, 12000);
  const raw = await chatCompletion(
    [
      {
        role: "system",
        content:
          "You extract a clean chapter outline for a high-school tutoring app. " +
          'Return JSON: { "chapters": [ { "title": string, "synopsis": string } ] }. ' +
          "Titles must be specific; synopses 1–2 sentences.",
      },
      {
        role: "user",
        content: [
          `Section: ${input.sectionName}`,
          `PDF filename: ${input.pdfName}`,
          `Produce about ${input.count} chapters from this PDF text excerpt:`,
          excerpt || "(little text extracted — invent a sensible outline from the filename/section)",
        ].join("\n\n"),
      },
    ],
    { json: true, temperature: 0.3 },
  );

  const parsed = JSON.parse(raw) as {
    chapters?: { title?: string; synopsis?: string }[];
  };
  const chapters = (parsed.chapters ?? [])
    .map((c) => ({
      title: String(c.title ?? "").trim(),
      synopsis: String(c.synopsis ?? "").trim(),
    }))
    .filter((c) => c.title.length > 0);
  if (!chapters.length) {
    throw new Error("OpenAI returned no chapters");
  }
  return chapters.slice(0, Math.max(input.count, chapters.length));
}

export async function generateChaptersFromPdf(input: {
  pdfAbsolutePath: string;
  pdfName: string;
  sectionName: string;
  count?: number;
}): Promise<GenerateChaptersResult> {
  const count = input.count ?? 5;
  const useOpenAI = isOpenAIConfigured();
  logAiMode("PDF→chapters", useOpenAI);

  if (!useOpenAI) {
    return {
      chapters: generateChaptersFromPdfStub({
        pdfName: input.pdfName,
        sectionName: input.sectionName,
        count,
      }),
      stub: true,
      provider: "stub",
    };
  }

  try {
    const text = await extractPdfText(input.pdfAbsolutePath);
    const chapters = await openaiChaptersFromText({
      sectionName: input.sectionName,
      pdfName: input.pdfName,
      text,
      count,
    });
    return { chapters, stub: false, provider: "openai" };
  } catch (e) {
    console.warn(
      "[ai] PDF→chapters OpenAI path failed; using stub:",
      e instanceof Error ? e.message : e,
    );
    return {
      chapters: generateChaptersFromPdfStub({
        pdfName: input.pdfName,
        sectionName: input.sectionName,
        count,
      }),
      stub: true,
      provider: "stub",
    };
  }
}
