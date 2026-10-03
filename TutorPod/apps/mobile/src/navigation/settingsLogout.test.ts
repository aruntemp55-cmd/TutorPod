import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SETTINGS_LOGOUT_ROUTE,
  settingsActionVisibility,
  settingsLogoutReset,
} from "./settingsLogout";

describe("R030 Settings logout (login-first)", () => {
  it("always shows Log out for signed-in students", () => {
    assert.equal(settingsActionVisibility(true).logout, true);
    assert.equal(settingsActionVisibility(false).logout, true);
  });

  it("keeps Back to Main only when the profile gate is complete", () => {
    assert.equal(settingsActionVisibility(true).backToMain, false);
    assert.equal(settingsActionVisibility(false).backToMain, true);
    assert.equal(settingsActionVisibility(true).saveOrContinue, true);
    assert.equal(settingsActionVisibility(false).saveOrContinue, true);
  });

  it("resets navigation to Login, not guest Home", () => {
    assert.equal(SETTINGS_LOGOUT_ROUTE, "Login");
    assert.deepEqual(settingsLogoutReset(), {
      index: 0,
      routes: [{ name: "Login" }],
    });
  });
});
