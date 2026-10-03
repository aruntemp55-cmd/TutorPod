import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  isOffline,
  noteNetworkFailure,
  noteNetworkSuccess,
  setOffline,
  subscribeOffline,
} from "./connectivity";

describe("T044 connectivity / offline", () => {
  beforeEach(() => {
    setOffline(false);
  });

  it("toggles offline and notifies subscribers", () => {
    const seen: boolean[] = [];
    const unsub = subscribeOffline((v) => seen.push(v));
    setOffline(true);
    setOffline(false);
    unsub();
    assert.deepEqual(seen, [true, false]);
    assert.equal(isOffline(), false);
  });

  it("marks offline on network-looking errors", () => {
    noteNetworkFailure(new Error("Network request failed"));
    assert.equal(isOffline(), true);
    noteNetworkSuccess();
    assert.equal(isOffline(), false);
  });
});
