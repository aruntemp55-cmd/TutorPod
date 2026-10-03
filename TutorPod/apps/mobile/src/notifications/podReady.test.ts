import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearPodReadyBanner,
  getLastPodReadyBanner,
  setPodReadyBanner,
} from "./podReady";

describe("T074 pod ready banner", () => {
  it("stores last banner payload", () => {
    clearPodReadyBanner();
    setPodReadyBanner({ podId: "p1", title: "Atoms" });
    assert.deepEqual(getLastPodReadyBanner(), {
      podId: "p1",
      title: "Atoms",
    });
    clearPodReadyBanner();
    assert.equal(getLastPodReadyBanner(), null);
  });
});
