/** T050 — client-side domain limits (mirrors API). */
export const HOST_COUNT_MIN = 2;
export const HOST_COUNT_MAX = 4;
export const CONTEXT_TEXT_MAX = 2000;
export const HOST_OPTIONS = [2, 3, 4] as const;

export function isValidHostCount(n: number) {
  return Number.isInteger(n) && n >= HOST_COUNT_MIN && n <= HOST_COUNT_MAX;
}

export function clampContextText(text: string) {
  return text.slice(0, CONTEXT_TEXT_MAX);
}

export function validateStartPodcastInput(input: {
  hostCount: number;
  contextText: string;
}): string | null {
  if (!isValidHostCount(input.hostCount)) {
    return `Choose ${HOST_COUNT_MIN}–${HOST_COUNT_MAX} hosts`;
  }
  if (input.contextText.length > CONTEXT_TEXT_MAX) {
    return `Context must be at most ${CONTEXT_TEXT_MAX} characters`;
  }
  return null;
}
