import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONTEXT_TEXT_MAX,
  HOST_COUNT_MAX,
  HOST_COUNT_MIN,
  assertPodCreateInput,
  validateContextText,
  validateHostCount,
  validateQuestionText,
} from "../src/domain/podLimits.js";

describe("T050 domain podLimits", () => {
  it("accepts hostCount 2–4", () => {
    for (const n of [HOST_COUNT_MIN, 3, HOST_COUNT_MAX]) {
      assert.equal(validateHostCount(n), null);
    }
  });

  it("rejects hostCount outside range", () => {
    assert.ok(validateHostCount(1));
    assert.ok(validateHostCount(5));
    assert.ok(validateHostCount(2.5));
  });

  it("enforces contextText max length", () => {
    assert.equal(validateContextText("ok"), null);
    assert.equal(validateContextText(undefined), null);
    assert.ok(validateContextText("x".repeat(CONTEXT_TEXT_MAX + 1)));
  });

  it("validates questionText bounds", () => {
    assert.ok(validateQuestionText(""));
    assert.ok(validateQuestionText("   "));
    assert.equal(validateQuestionText("Why?"), null);
    assert.ok(validateQuestionText("q".repeat(1001)));
  });

  it("assertPodCreateInput throws on bad hosts", () => {
    assert.throws(() => assertPodCreateInput({ hostCount: 1 }), /hostCount/);
    assert.doesNotThrow(() =>
      assertPodCreateInput({ hostCount: 2, contextText: "focus" }),
    );
  });
});
