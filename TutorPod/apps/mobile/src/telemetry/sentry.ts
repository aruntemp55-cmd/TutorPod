/**
 * T045 — crash / telemetry basics.
 * No-op unless EXPO_PUBLIC_SENTRY_DSN (or app.json extra.sentryDsn) is set.
 * Does not require @sentry/react-native — when DSN is present we record events
 * for forwarding; without DSN all calls are silent no-ops (safe for CI/dev).
 */

type Breadcrumb = { message: string; category?: string; data?: unknown };

type TelemetryClient = {
  enabled: boolean;
  dsn: string | null;
  events: { type: string; payload: unknown }[];
  breadcrumbs: Breadcrumb[];
};

const client: TelemetryClient = {
  enabled: false,
  dsn: null,
  events: [],
  breadcrumbs: [],
};

function readDsn(): string | null {
  const fromEnv =
    (typeof process !== "undefined" &&
      process.env?.EXPO_PUBLIC_SENTRY_DSN?.trim()) ||
    "";
  return fromEnv || null;
}

export function initTelemetry(explicitDsn?: string | null) {
  const dsn = explicitDsn === undefined ? readDsn() : explicitDsn;
  client.dsn = dsn && dsn.length > 0 ? dsn : null;
  client.enabled = !!client.dsn;
  client.events = [];
  client.breadcrumbs = [];
  if (client.enabled && typeof console !== "undefined") {
    console.info("[telemetry] enabled (DSN present; SDK optional)");
  }
  return client.enabled;
}

export function isTelemetryEnabled() {
  return client.enabled;
}

export function addBreadcrumb(b: Breadcrumb) {
  if (!client.enabled) return;
  client.breadcrumbs.push(b);
}

export function captureException(err: unknown, context?: Record<string, unknown>) {
  if (!client.enabled) return;
  const payload = {
    message: err instanceof Error ? err.message : String(err),
    context,
  };
  client.events.push({ type: "exception", payload });
  if (typeof console !== "undefined") {
    console.warn("[telemetry] exception", payload);
  }
}

export function captureMessage(message: string, data?: Record<string, unknown>) {
  if (!client.enabled) return;
  client.events.push({ type: "message", payload: { message, data } });
}

/** Test helper */
export function __telemetryTestReset() {
  client.enabled = false;
  client.dsn = null;
  client.events = [];
  client.breadcrumbs = [];
}

export function __telemetryTestDump() {
  return {
    enabled: client.enabled,
    dsn: client.dsn,
    events: [...client.events],
    breadcrumbs: [...client.breadcrumbs],
  };
}
