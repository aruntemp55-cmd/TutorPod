/**
 * Raise-hand Q&A — OpenAI when OPENAI_API_KEY is set; stub otherwise.
 */

import {
  chatCompletion,
  isOpenAIConfigured,
  logAiMode,
} from "./openaiClient.js";

export type AnswerQuestionInput = {
  questionText: string;
  chapterTitle: string;
  synopsis: string | null;
  contextText: string | null;
};

export type AnswerQuestionFn = (input: AnswerQuestionInput) => Promise<string>;

async function stubAnswer(input: AnswerQuestionInput): Promise<string> {
  if (process.env.LLM_FAIL === "1") {
    throw new Error("AI unavailable");
  }
  const ctx = [
    `Chapter: ${input.chapterTitle}`,
    input.synopsis ? `Synopsis: ${input.synopsis}` : null,
    input.contextText ? `Student focus: ${input.contextText}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    `Great question about “${input.chapterTitle}”.\n\n` +
    `Based on this lesson context:\n${ctx}\n\n` +
    `Focus on the core idea — break the concept into definitions, a worked intuition, ` +
    `and one exam tip. Re-listen from ~30 seconds earlier if the hosts just introduced a term, ` +
    `then raise your hand again with a narrower follow-up.`
  );
}

async function openaiAnswer(input: AnswerQuestionInput): Promise<string> {
  return chatCompletion(
    [
      {
        role: "system",
        content:
          "You are a warm, precise high-school tutor in a listen-first podcast app. " +
          "Answer briefly (2–4 short paragraphs). Use plain language, one worked intuition, " +
          "and one exam tip. Do not invent citations.",
      },
      {
        role: "user",
        content: [
          `Chapter: ${input.chapterTitle}`,
          input.synopsis ? `Synopsis: ${input.synopsis}` : null,
          input.contextText ? `Student focus: ${input.contextText}` : null,
          `Question: ${input.questionText}`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    { temperature: 0.5 },
  );
}

let impl: AnswerQuestionFn | null = null;

/** Test helper — inject mock; restore with resetAnswerQuestionImpl(). */
export function setAnswerQuestionImpl(fn: AnswerQuestionFn) {
  impl = fn;
}

export function resetAnswerQuestionImpl() {
  impl = null;
}

export async function answerQuestion(
  input: AnswerQuestionInput,
): Promise<string> {
  if (impl) return impl(input);

  const useOpenAI = isOpenAIConfigured();
  logAiMode("raise-hand Q&A", useOpenAI);
  if (!useOpenAI) return stubAnswer(input);

  try {
    return await openaiAnswer(input);
  } catch (e) {
    console.warn(
      "[ai] raise-hand OpenAI failed; using stub:",
      e instanceof Error ? e.message : e,
    );
    return stubAnswer(input);
  }
}
