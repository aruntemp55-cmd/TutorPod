import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { userFacingVoiceError } from "./sttCopy";

describe("userFacingVoiceError", () => {
  it("maps STT_UNAVAILABLE to type-instead copy", () => {
    const msg = userFacingVoiceError({
      code: "STT_UNAVAILABLE",
      message: "Speech-to-text needs OPENAI_API_KEY",
    });
    assert.match(msg, /Voice needs an API key/i);
    assert.match(msg, /Type your question/i);
  });

  it("maps Failed to fetch to type-instead copy", () => {
    const msg = userFacingVoiceError(new TypeError("Failed to fetch"));
    assert.doesNotMatch(msg, /Failed to fetch/i);
    assert.match(msg, /type your question/i);
  });
});
