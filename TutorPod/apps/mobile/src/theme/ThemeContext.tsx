import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import { kvGet, kvSet } from "../auth/kvStore";
import {
  parseThemePreference,
  resolveColorScheme,
  THEME_PREF_KEY,
  type ColorScheme,
  type ThemePreference,
} from "./preference";
import { paletteFor, type ColorTokens } from "./tokens";

type ThemeContextValue = {
  preference: ThemePreference;
  scheme: ColorScheme;
  colors: ColorTokens;
  setPreference: (next: ThemePreference) => void;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await kvGet(THEME_PREF_KEY);
        if (!cancelled) setPreferenceState(parseThemePreference(raw));
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void kvSet(THEME_PREF_KEY, next);
  }, []);

  const scheme = resolveColorScheme(
    preference,
    system === "light" || system === "dark" ? system : "dark",
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      scheme,
      colors: paletteFor(scheme),
      setPreference,
      ready,
    }),
    [preference, scheme, setPreference, ready],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
