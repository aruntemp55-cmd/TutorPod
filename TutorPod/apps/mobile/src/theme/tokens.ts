/** Semantic color tokens — NotebookLM-style dark + paired light palette. */

export type ColorTokens = {
  canvas: string;
  surface: string;
  card: string;
  pill: string;
  text: string;
  textSecondary: string;
  textDisabled: string;
  accent: string;
  waveA: string;
  waveB: string;
  avatar: string;
  chem: string;
  error: string;
  success: string;
  white: string;
  black: string;
  /** Primary CTA fill (high contrast vs canvas) */
  buttonPrimary: string;
  buttonPrimaryText: string;
  errorBanner: string;
  scrim: string;
};

/** Current NotebookLM-style dark (default resolved palette). */
export const darkColors: ColorTokens = {
  canvas: "#121316",
  surface: "#1E2024",
  card: "#282A2F",
  pill: "#2C2E33",
  text: "#FFFFFF",
  textSecondary: "#9AA0A6",
  textDisabled: "#5F6368",
  accent: "#5B6CFF",
  waveA: "#7B8CFF",
  waveB: "#7DDBA3",
  avatar: "#3B82F6",
  chem: "#2DD4BF",
  error: "#F87171",
  success: "#34D399",
  white: "#FFFFFF",
  black: "#000000",
  buttonPrimary: "#FFFFFF",
  buttonPrimaryText: "#121316",
  errorBanner: "#3A1F1F",
  scrim: "#00000099",
};

export const lightColors: ColorTokens = {
  canvas: "#F5F6F8",
  surface: "#FFFFFF",
  card: "#ECEEF2",
  pill: "#E2E5EB",
  text: "#121316",
  textSecondary: "#5F6368",
  textDisabled: "#9AA0A6",
  accent: "#4C5CE0",
  waveA: "#5B6CFF",
  waveB: "#2F9E6E",
  avatar: "#3B82F6",
  chem: "#0D9488",
  error: "#DC2626",
  success: "#059669",
  white: "#FFFFFF",
  black: "#000000",
  buttonPrimary: "#121316",
  buttonPrimaryText: "#FFFFFF",
  errorBanner: "#FEE2E2",
  scrim: "#00000066",
};

/** @deprecated Prefer `useTheme().colors` — kept as dark default for non-themed call sites. */
export const colors: ColorTokens = darkColors;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
};

export const radius = {
  card: 16,
  button: 14,
  pill: 999,
  sheet: 20,
};

export function paletteFor(scheme: "light" | "dark"): ColorTokens {
  return scheme === "light" ? lightColors : darkColors;
}
