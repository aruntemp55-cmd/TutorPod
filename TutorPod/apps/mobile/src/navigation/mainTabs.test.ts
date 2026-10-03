import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAIN_TAB_ROUTES } from "./mainTabs";

describe("T023 MainTabs", () => {
  it("exposes Home, MyPods, Account", () => {
    assert.deepEqual(
      MAIN_TAB_ROUTES.map((t) => t.name),
      ["Home", "MyPodsTab", "Account"],
    );
    assert.equal(MAIN_TAB_ROUTES[1].title, "MyPods");
  });
});
