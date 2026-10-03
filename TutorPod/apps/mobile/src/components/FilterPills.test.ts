import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

describe("T022 / T073 FilterPills", () => {
  it("defines All, Search, Studio, MyPods, Learning Path keys", () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(dir, "FilterPills.tsx"), "utf8");
    assert.match(src, /key: "all"/);
    assert.match(src, /key: "search"/);
    assert.match(src, /key: "studio"/);
    assert.match(src, /key: "mypods"/);
    assert.match(src, /key: "learning"/);
    assert.match(src, /label: "Studio"/);
    assert.match(src, /label: "Search"/);
  });
});
