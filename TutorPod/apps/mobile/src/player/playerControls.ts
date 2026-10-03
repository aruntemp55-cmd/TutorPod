/** T034 — pure player control state for unit tests (skip / speed / play-pause). */
export const PLAYBACK_SPEEDS = [1, 1.25, 1.5, 2] as const;

export type PlayerControlsState = {
  playing: boolean;
  positionSec: number;
  durationSec: number;
  speedIdx: number;
};

export type PlayerControlsAction =
  | { type: "toggle" }
  | { type: "play" }
  | { type: "pause" }
  | { type: "skip"; deltaSec: number }
  | { type: "setPosition"; positionSec: number }
  | { type: "setDuration"; durationSec: number }
  | { type: "cycleSpeed" };

export function playerControlsReducer(
  state: PlayerControlsState,
  action: PlayerControlsAction,
): PlayerControlsState {
  switch (action.type) {
    case "toggle":
      return { ...state, playing: !state.playing };
    case "play":
      return { ...state, playing: true };
    case "pause":
      return { ...state, playing: false };
    case "skip": {
      const next = Math.max(
        0,
        Math.min(
          state.durationSec || Number.MAX_SAFE_INTEGER,
          state.positionSec + action.deltaSec,
        ),
      );
      return { ...state, positionSec: next };
    }
    case "setPosition":
      return { ...state, positionSec: Math.max(0, action.positionSec) };
    case "setDuration":
      return { ...state, durationSec: Math.max(0, action.durationSec) };
    case "cycleSpeed":
      return {
        ...state,
        speedIdx: (state.speedIdx + 1) % PLAYBACK_SPEEDS.length,
      };
    default:
      return state;
  }
}

export function currentSpeed(state: PlayerControlsState) {
  return PLAYBACK_SPEEDS[state.speedIdx] ?? 1;
}
