import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  __telemetryTestDump,
  __telemetryTestReset,
  captureException,
  captureMessage,
  initTelemetry,
  isTelemetryEnabled,
} from "./sentry";

describe("T045 telemetry", () => {
  beforeEach(() => {
    __telemetryTestReset();
  });

  it("is no-op without DSN", () => {
    assert.equal(initTelemetry(null), false);
    assert.equal(isTelemetryEnabled(), false);
    captureException(new Error("boom"));
    captureMessage("hi");
    assert.equal(__telemetryTestDump().events.length, 0);
  });

  it("records events when DSN set", () => {
    assert.equal(initTelemetry("https://example@sentry.invalid/1"), true);
    captureException(new Error("qa failed"), { podId: "p1" });
    captureMessage("app.start");
    const dump = __telemetryTestDump();
    assert.equal(dump.events.length, 2);
    assert.equal(dump.events[0].type, "exception");
  });
});
