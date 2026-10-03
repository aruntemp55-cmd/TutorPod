import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  currentSpeed,
  playerControlsReducer,
  type PlayerControlsState,
} from "./playerControls";

const base: PlayerControlsState = {
  playing: false,
  positionSec: 30,
  durationSec: 100,
  speedIdx: 0,
};

describe("T034 playerControlsReducer", () => {
  it("toggles play/pause", () => {
    const a = playerControlsReducer(base, { type: "toggle" });
    assert.equal(a.playing, true);
    assert.equal(playerControlsReducer(a, { type: "pause" }).playing, false);
  });

  it("skips ±10 within bounds", () => {
    assert.equal(
      playerControlsReducer(base, { type: "skip", deltaSec: -10 }).positionSec,
      20,
    );
    assert.equal(
      playerControlsReducer(base, { type: "skip", deltaSec: 10 }).positionSec,
      40,
    );
    assert.equal(
      playerControlsReducer(
        { ...base, positionSec: 5 },
        { type: "skip", deltaSec: -10 },
      ).positionSec,
      0,
    );
    assert.equal(
      playerControlsReducer(
        { ...base, positionSec: 95 },
        { type: "skip", deltaSec: 10 },
      ).positionSec,
      100,
    );
  });

  it("cycles speed 1 → 1.25 → 1.5 → 2 → 1", () => {
    let s = base;
    const speeds: number[] = [];
    for (let i = 0; i < 4; i++) {
      s = playerControlsReducer(s, { type: "cycleSpeed" });
      speeds.push(currentSpeed(s));
    }
    assert.deepEqual(speeds, [1.25, 1.5, 2, 1]);
  });
});
