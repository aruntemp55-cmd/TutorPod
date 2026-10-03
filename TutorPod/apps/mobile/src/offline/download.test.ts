import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeOfflineIndex } from "./downloadIndex";

describe("T072 offline download index", () => {
  it("merges pod entry into index", () => {
    const next = mergeOfflineIndex({}, "p1", "file:///offline/p1.mp3", "Atoms");
    assert.equal(next.p1.uri, "file:///offline/p1.mp3");
    assert.equal(next.p1.title, "Atoms");
  });
});
