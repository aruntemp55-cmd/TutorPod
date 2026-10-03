import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  peekPendingAction,
  setPendingAction,
  takePendingAction,
} from "./pendingAction";

describe("T014 pendingAction resume store", () => {
  beforeEach(() => {
    setPendingAction(null);
  });

  it("stores and takes startPodcast once", () => {
    setPendingAction({
      type: "startPodcast",
      standardId: "std-1",
      sectionId: "sec-1",
      chapterId: "ch-1",
      chapterTitle: "Carbonyls",
    });
    assert.equal(peekPendingAction()?.type, "startPodcast");
    const taken = takePendingAction();
    assert.equal(taken?.type, "startPodcast");
    if (taken?.type === "startPodcast") {
      assert.equal(taken.chapterId, "ch-1");
      assert.equal(taken.standardId, "std-1");
    }
    assert.equal(takePendingAction(), null);
  });

  it("clears on explicit null", () => {
    setPendingAction({ type: "openMyPods" });
    setPendingAction(null);
    assert.equal(peekPendingAction(), null);
  });
});
