import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

describe("T044 Empty/Error/Offline polish", () => {
  it("exports EmptyState, ErrorBanner, OfflineBanner", () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(dir, "ui.tsx"), "utf8");
    assert.match(src, /export function EmptyState/);
    assert.match(src, /export function ErrorBanner/);
    assert.match(src, /export function OfflineBanner/);
    assert.match(src, /onRetry/);
    assert.match(src, /You appear offline/);
  });
});
