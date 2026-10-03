import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isProfileComplete, studentHomeRoute } from "./profileComplete";
import type { User } from "../api/types";

const base: User = {
  id: "1",
  email: "a@b.com",
  name: "",
  standardId: null,
  role: "student",
};

describe("R025 profileComplete", () => {
  it("gates incomplete students", () => {
    assert.equal(isProfileComplete(base), false);
    assert.equal(isProfileComplete({ ...base, name: "Priya" }), false);
    assert.equal(
      isProfileComplete({
        ...base,
        name: "Priya",
        standardId: "std",
      }),
      true,
    );
    assert.equal(studentHomeRoute({ ...base, name: "P", standardId: "s" }), "Main");
    assert.equal(studentHomeRoute(base), "Settings");
  });
});
