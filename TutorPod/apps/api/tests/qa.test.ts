import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  answerQuestion,
  resetAnswerQuestionImpl,
  setAnswerQuestionImpl,
} from "../src/services/qa.js";

describe("T040 QA adapter", () => {
  afterEach(() => {
    resetAnswerQuestionImpl();
    delete process.env.LLM_FAIL;
    delete process.env.OPENAI_API_KEY;
  });

  // Ensure stub path (no live OpenAI calls in unit tests)
  process.env.OPENAI_API_KEY = "";

  it("returns stub answer with chapter context", async () => {
    const text = await answerQuestion({
      questionText: "What is SN2?",
      chapterTitle: "Haloalkanes",
      synopsis: "Mechanisms",
      contextText: "boards",
    });
    assert.match(text, /Haloalkanes/);
    assert.match(text, /Mechanisms/);
  });

  it("supports injectable mock LLM", async () => {
    setAnswerQuestionImpl(async () => "mock-answer");
    assert.equal(
      await answerQuestion({
        questionText: "x",
        chapterTitle: "y",
        synopsis: null,
        contextText: null,
      }),
      "mock-answer",
    );
  });

  it("throws when LLM_FAIL=1", async () => {
    process.env.LLM_FAIL = "1";
    await assert.rejects(
      () =>
        answerQuestion({
          questionText: "x",
          chapterTitle: "y",
          synopsis: null,
          contextText: null,
        }),
      /AI unavailable/,
    );
  });
});
