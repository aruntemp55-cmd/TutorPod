import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseThemePreference,
  resolveColorScheme,
} from "./preference";

describe("theme preference", () => {
  it("parses stored values and defaults to dark", () => {
    assert.equal(parseThemePreference("light"), "light");
    assert.equal(parseThemePreference("dark"), "dark");
    assert.equal(parseThemePreference("system"), "system");
    assert.equal(parseThemePreference(null), "dark");
    assert.equal(parseThemePreference("weird"), "dark");
  });

  it("resolves system preference from OS scheme", () => {
    assert.equal(resolveColorScheme("light", "dark"), "light");
    assert.equal(resolveColorScheme("dark", "light"), "dark");
    assert.equal(resolveColorScheme("system", "light"), "light");
    assert.equal(resolveColorScheme("system", "dark"), "dark");
    assert.equal(resolveColorScheme("system", null), "dark");
  });
});
