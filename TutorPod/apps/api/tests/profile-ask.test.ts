import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isProfileComplete } from "../src/domain/profile.js";
import { answerAsk } from "../src/services/ask.js";

describe("R025 profileComplete", () => {
  it("requires name and standard for students", () => {
    assert.equal(isProfileComplete({ name: "", standard_id: null }), false);
    assert.equal(
      isProfileComplete({ name: "Priya", standard_id: null }),
      false,
    );
    assert.equal(
      isProfileComplete({
        name: "Priya",
        standardId: "00000000-0000-0000-0000-000000000001",
      }),
      true,
    );
    assert.equal(
      isProfileComplete({ name: "", standard_id: null, role: "admin" }),
      true,
    );
  });
});

describe("R027 ask stub", () => {
  it("returns stub answer without OpenAI", async () => {
    const prev = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "";
    const ans = await answerAsk({
      message: "What is mole?",
      studentName: "Priya",
      standardName: "Class 12",
    });
    assert.match(ans, /mole|question|tutor/i);
    process.env.OPENAI_API_KEY = prev;
  });
});
