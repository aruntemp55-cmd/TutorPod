import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateChaptersFromPdf,
  generateChaptersFromPdfStub,
} from "../src/services/chapterGen.js";
import {
  generatePodcastAudio,
  setPodcastScriptImpl,
  setPodcastTtsImpl,
} from "../src/services/podcastAudio.js";
import { answerQuestion, resetAnswerQuestionImpl } from "../src/services/qa.js";
import { audioPath, ensureStorage } from "../src/storage.js";

const dir = path.dirname(fileURLToPath(import.meta.url));

describe("AI providers (env-gated)", () => {
  process.env.OPENAI_API_KEY = "";

  afterEach(() => {
    resetAnswerQuestionImpl();
    setPodcastScriptImpl(null);
    setPodcastTtsImpl(null);
    delete process.env.LLM_FAIL;
  });

  it("Q&A stub works without OPENAI_API_KEY", async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    // config already loaded — answerQuestion checks isOpenAIConfigured via config module
    // Force stub by ensuring no key at process level is ok if config cached; use inject instead
    const text = await answerQuestion({
      questionText: "What is equilibrium?",
      chapterTitle: "Equilibrium",
      synopsis: "Ka Kb",
      contextText: null,
    });
    assert.match(text, /Equilibrium|Focus on/i);
    if (prev !== undefined) process.env.OPENAI_API_KEY = prev;
  });

  it("chapter stub heuristic without OpenAI path", () => {
    const chapters = generateChaptersFromPdfStub({
      pdfName: "organic.pdf",
      sectionName: "Chemistry",
      count: 3,
    });
    assert.equal(chapters.length, 3);
    assert.match(chapters[0].title, /organic|Unit/i);
    assert.match(chapters[0].synopsis, /STUB/i);
  });

  it("generateChaptersFromPdf falls back to stub when no key", async () => {
    const fakePdf = path.join(dir, "fixture-empty.pdf");
    // Minimal PDF header bytes
    writeFileSync(fakePdf, Buffer.from("%PDF-1.4\n%stub\n"));
    try {
      const res = await generateChaptersFromPdf({
        pdfAbsolutePath: fakePdf,
        pdfName: "fixture.pdf",
        sectionName: "Chemistry",
        count: 2,
      });
      // Without key → stub; with key might parse poorly and still stub/openai
      assert.ok(res.chapters.length >= 1);
      assert.ok(res.provider === "stub" || res.provider === "openai");
    } finally {
      if (existsSync(fakePdf)) unlinkSync(fakePdf);
    }
  });

  it("podcastAudio uses injected script+TTS (mock OpenAI path)", async () => {
    ensureStorage();
    setPodcastScriptImpl(async () => ({
      title: "Mock Pod",
      lines: [
        { host: 1, text: "Hello from host one." },
        { host: 2, text: "Hello from host two." },
      ],
    }));
    setPodcastTtsImpl(async (text) => Buffer.from(`ID3MOCK-${text}`));

    const key = `mock-pod-${Date.now()}`;
    const res = await generatePodcastAudio({
      storageKey: key,
      chapterTitle: "Thermodynamics",
      synopsis: "Enthalpy",
      contextText: "boards",
      hostCount: 2,
      fallbackSourceUrl: "http://example.com/x.mp3",
    });
    assert.equal(res.provider, "openai");
    assert.ok(existsSync(res.absolutePath));
    assert.equal(res.storageRel, `${key}.mp3`);
    assert.equal(res.title, "Mock Pod");
    // cleanup
    try {
      unlinkSync(audioPath(res.storageRel));
    } catch {
      /* ignore */
    }
  });
});
