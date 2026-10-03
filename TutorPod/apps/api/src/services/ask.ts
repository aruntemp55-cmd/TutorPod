/**
 * Freeform “Ask any question” tutor chat — OpenAI when keyed; stub otherwise.
 */

import {
  chatCompletion,
  isOpenAIConfigured,
  logAiMode,
} from "./openaiClient.js";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type AskInput = {
  message: string;
  history?: ChatTurn[];
  studentName?: string | null;
  standardName?: string | null;
};

async function stubAsk(input: AskInput): Promise<string> {
  if (process.env.LLM_FAIL === "1") {
    throw new Error("AI unavailable");
  }
  const who = input.studentName?.trim() || "there";
  return (
    `Hi ${who} — great question.\n\n` +
    `You asked: “${input.message.trim()}”.\n\n` +
    `Here’s a short tutor-style answer: break the idea into (1) a clear definition, ` +
    `(2) one intuition or example, and (3) an exam tip. ` +
    (input.standardName
      ? `This fits your ${input.standardName} syllabus focus. `
      : "") +
    `Ask a follow-up anytime, or open a subject tile to start a podcast lesson.`
  );
}

async function openaiAsk(input: AskInput): Promise<string> {
  const history = (input.history ?? []).slice(-8).map((t) => ({
    role: t.role as "user" | "assistant",
    content: t.content,
  }));
  return chatCompletion(
    [
      {
        role: "system",
        content:
          "You are Tutor Pod — a warm high-school tutor. Answer clearly in 2–4 short paragraphs. " +
          "No markdown tables. Prefer definitions, intuition, and one exam tip.",
      },
      ...history,
      {
        role: "user",
        content: [
          input.standardName ? `Student standard: ${input.standardName}` : null,
          input.studentName ? `Student name: ${input.studentName}` : null,
          `Question: ${input.message}`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    { temperature: 0.5 },
  );
}

export async function answerAsk(input: AskInput): Promise<string> {
  const useOpenAI = isOpenAIConfigured();
  logAiMode("ask-any-question", useOpenAI);
  if (!useOpenAI) return stubAsk(input);
  try {
    return await openaiAsk(input);
  } catch (e) {
    console.warn(
      "[ai] ask OpenAI failed; using stub:",
      e instanceof Error ? e.message : e,
    );
    return stubAsk(input);
  }
}
