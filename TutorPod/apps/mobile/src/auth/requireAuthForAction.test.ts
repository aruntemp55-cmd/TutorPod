import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { requireAuthForAction } from "./requireAuthForAction";

describe("T024 requireAuthForAction", () => {
  it("calls onGuest when unauthenticated and skips onAuthed", () => {
    let guest = 0;
    let authed = 0;
    const ok = requireAuthForAction(
      false,
      () => {
        guest += 1;
      },
      () => {
        authed += 1;
      },
    );
    assert.equal(ok, false);
    assert.equal(guest, 1);
    assert.equal(authed, 0);
  });

  it("calls onAuthed when authenticated", () => {
    let guest = 0;
    let authed = 0;
    const ok = requireAuthForAction(
      true,
      () => {
        guest += 1;
      },
      () => {
        authed += 1;
      },
    );
    assert.equal(ok, true);
    assert.equal(guest, 0);
    assert.equal(authed, 1);
  });
});
