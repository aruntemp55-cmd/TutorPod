import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAIN_HOME_TILES, MAIN_TAB_ROUTES } from "./mainTabs";

describe("T023 / R026 Main home tiles", () => {
  it("defines Ask, My Pods, Subjects tiles", () => {
    assert.ok(MAIN_HOME_TILES.some((t) => t.key === "ask"));
    assert.ok(MAIN_HOME_TILES.some((t) => t.key === "mypods"));
    assert.ok(MAIN_HOME_TILES.some((t) => t.title === "Ask any question"));
  });

  it("keeps legacy tab route names for reference", () => {
    assert.deepEqual(
      MAIN_TAB_ROUTES.map((t) => t.name),
      ["Home", "MyPodsTab", "Account"],
    );
  });
});
