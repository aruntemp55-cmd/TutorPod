import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  assertPodCreateAllowed,
  assertQuestionAllowed,
  rateLimitConfig,
  resetRateLimits,
} from "../src/rateLimit.js";
import { AppError } from "../src/errors.js";

afterEach(() => {
  resetRateLimits();
  delete process.env.RATE_LIMIT_MAX_PODS;
  delete process.env.RATE_LIMIT_MAX_QUESTIONS;
  delete process.env.POD_DAILY_QUOTA;
  delete process.env.RATE_LIMIT_WINDOW_MS;
});

describe("T076 rateLimit", () => {
  it("reads env defaults", () => {
    const cfg = rateLimitConfig();
    assert.ok(cfg.windowMs > 0);
    assert.ok(cfg.maxPods > 0);
    assert.ok(cfg.podDailyQuota > 0);
  });

  it("429 after max pod creates in window", () => {
    process.env.RATE_LIMIT_MAX_PODS = "2";
    process.env.POD_DAILY_QUOTA = "100";
    assertPodCreateAllowed("u1");
    assertPodCreateAllowed("u1");
    assert.throws(
      () => assertPodCreateAllowed("u1"),
      (e: unknown) => e instanceof AppError && e.statusCode === 429,
    );
  });

  it("429 on daily pod quota", () => {
    process.env.RATE_LIMIT_MAX_PODS = "100";
    process.env.POD_DAILY_QUOTA = "2";
    assertPodCreateAllowed("u2");
    assertPodCreateAllowed("u2");
    assert.throws(
      () => assertPodCreateAllowed("u2"),
      (e: unknown) =>
        e instanceof AppError &&
        e.statusCode === 429 &&
        e.code === "QUOTA_EXCEEDED",
    );
  });

  it("limits questions separately", () => {
    process.env.RATE_LIMIT_MAX_QUESTIONS = "1";
    assertQuestionAllowed("u3");
    assert.throws(
      () => assertQuestionAllowed("u3"),
      (e: unknown) => e instanceof AppError && e.statusCode === 429,
    );
  });
});
