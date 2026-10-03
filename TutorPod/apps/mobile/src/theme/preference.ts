/** Theme preference persistence helpers (pure — unit-testable). */

export type ThemePreference = "system" | "light" | "dark";
export type ColorScheme = "light" | "dark";

export const THEME_PREF_KEY = "tutorpod.themePreference";

export function parseThemePreference(raw: string | null | undefined): ThemePreference {
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "dark";
}

export function resolveColorScheme(
  preference: ThemePreference,
  systemScheme: ColorScheme | null | undefined,
): ColorScheme {
  if (preference === "light" || preference === "dark") return preference;
  return systemScheme === "light" ? "light" : "dark";
}

export const THEME_OPTIONS: { key: ThemePreference; label: string }[] = [
  { key: "system", label: "System" },
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
];
