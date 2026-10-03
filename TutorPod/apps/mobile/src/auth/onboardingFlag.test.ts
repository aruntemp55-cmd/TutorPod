import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

describe("T012 onboardingFlag module", () => {
  it("exports isOnboardingDone and setOnboardingDone", () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(dir, "onboardingFlag.ts"), "utf8");
    assert.match(src, /isOnboardingDone\(\)/);
    assert.match(src, /setOnboardingDone\(\)/);
    assert.match(src, /tutorpod\.onboardingDone/);
  });
});
