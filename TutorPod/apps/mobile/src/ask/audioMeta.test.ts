import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { guessAudioMeta } from "./audioMeta";

describe("guessAudioMeta", () => {
  it("maps common recorder extensions", () => {
    assert.deepEqual(guessAudioMeta("file:///tmp/q.m4a"), {
      name: "question.m4a",
      type: "audio/mp4",
    });
    assert.deepEqual(guessAudioMeta("blob:http://localhost/x.webm"), {
      name: "question.webm",
      type: "audio/webm",
    });
    assert.deepEqual(guessAudioMeta("/cache/rec.wav"), {
      name: "question.wav",
      type: "audio/wav",
    });
    assert.deepEqual(guessAudioMeta("caf://a.caf"), {
      name: "question.caf",
      type: "audio/x-caf",
    });
  });

  it("defaults unknown extensions to m4a", () => {
    assert.deepEqual(guessAudioMeta("file:///tmp/q"), {
      name: "question.m4a",
      type: "audio/mp4",
    });
  });
});
