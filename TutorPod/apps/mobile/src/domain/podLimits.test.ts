import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONTEXT_TEXT_MAX,
  HOST_OPTIONS,
  clampContextText,
  isValidHostCount,
  validateStartPodcastInput,
} from "./podLimits";

describe("T050 mobile domain podLimits", () => {
  it("HOST_OPTIONS are 2–4", () => {
    assert.deepEqual([...HOST_OPTIONS], [2, 3, 4]);
    assert.ok(HOST_OPTIONS.every(isValidHostCount));
  });

  it("validateStartPodcastInput", () => {
    assert.equal(
      validateStartPodcastInput({ hostCount: 2, contextText: "" }),
      null,
    );
    assert.match(
      validateStartPodcastInput({ hostCount: 1, contextText: "" }) ?? "",
      /hosts/,
    );
    assert.match(
      validateStartPodcastInput({
        hostCount: 2,
        contextText: "x".repeat(CONTEXT_TEXT_MAX + 1),
      }) ?? "",
      /Context/,
    );
  });

  it("clampContextText", () => {
    assert.equal(clampContextText("x".repeat(10)).length, 10);
    assert.equal(
      clampContextText("x".repeat(CONTEXT_TEXT_MAX + 50)).length,
      CONTEXT_TEXT_MAX,
    );
  });
});
