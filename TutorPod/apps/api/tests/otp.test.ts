import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  issueOtpCode,
  rejectStubOtpInProd,
} from "../src/auth/otp.js";

describe("OTP stub vs production", () => {
  it("issues 000000 in non-production", () => {
    const issued = issueOtpCode({
      nodeEnv: "development",
      stubCode: "000000",
    });
    assert.equal(issued.mode, "stub");
    assert.equal(issued.code, "000000");
    assert.equal(
      rejectStubOtpInProd("000000", { nodeEnv: "test", stubCode: "000000" }),
      false,
    );
  });

  it("never issues or accepts the stub in production", () => {
    for (let i = 0; i < 20; i++) {
      const issued = issueOtpCode({
        nodeEnv: "production",
        stubCode: "000000",
      });
      assert.equal(issued.mode, "generated");
      assert.notEqual(issued.code, "000000");
      assert.match(issued.code, /^\d{6}$/);
    }
    assert.equal(
      rejectStubOtpInProd("000000", {
        nodeEnv: "production",
        stubCode: "000000",
      }),
      true,
    );
  });
});
