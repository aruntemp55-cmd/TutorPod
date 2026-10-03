/** T050 — domain limits for podcast create / Q&A. */

export const HOST_COUNT_MIN = 2;
export const HOST_COUNT_MAX = 4;
export const CONTEXT_TEXT_MAX = 2000;
export const QUESTION_TEXT_MIN = 1;
export const QUESTION_TEXT_MAX = 1000;

export type DomainIssue = { field: string; message: string };

export function validateHostCount(value: unknown): DomainIssue | null {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return { field: "hostCount", message: "hostCount must be an integer" };
  }
  if (value < HOST_COUNT_MIN || value > HOST_COUNT_MAX) {
    return {
      field: "hostCount",
      message: `hostCount must be between ${HOST_COUNT_MIN} and ${HOST_COUNT_MAX}`,
    };
  }
  return null;
}

export function validateContextText(value: unknown): DomainIssue | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    return { field: "contextText", message: "contextText must be a string" };
  }
  if (value.length > CONTEXT_TEXT_MAX) {
    return {
      field: "contextText",
      message: `contextText must be at most ${CONTEXT_TEXT_MAX} characters`,
    };
  }
  return null;
}

export function validateQuestionText(value: unknown): DomainIssue | null {
  if (typeof value !== "string") {
    return { field: "questionText", message: "questionText must be a string" };
  }
  const trimmed = value.trim();
  if (trimmed.length < QUESTION_TEXT_MIN) {
    return { field: "questionText", message: "questionText is required" };
  }
  if (trimmed.length > QUESTION_TEXT_MAX) {
    return {
      field: "questionText",
      message: `questionText must be at most ${QUESTION_TEXT_MAX} characters`,
    };
  }
  return null;
}

export function assertPodCreateInput(input: {
  hostCount: unknown;
  contextText?: unknown;
}): void {
  const issues = [
    validateHostCount(input.hostCount),
    validateContextText(input.contextText),
  ].filter(Boolean) as DomainIssue[];
  if (issues.length) {
    const err = new Error(issues.map((i) => i.message).join("; "));
    (err as Error & { code: string }).code = "VALIDATION";
    throw err;
  }
}
