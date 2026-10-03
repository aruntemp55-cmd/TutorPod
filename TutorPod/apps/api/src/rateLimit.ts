/**
 * In-memory rate limits + daily pod create quotas (T076).
 * Process-local — fine for single-instance / CI; swap for Redis in multi-instance.
 */

import { AppError } from "./errors.js";

type Bucket = { count: number; resetAt: number };

const windows = new Map<string, Bucket>();
const dailyPods = new Map<string, { count: number; day: string }>();

function envInt(name: string, fallback: number) {
  const n = Number(process.env[name] ?? fallback);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function rateLimitConfig() {
  return {
    windowMs: envInt("RATE_LIMIT_WINDOW_MS", 60_000),
    maxPods: envInt("RATE_LIMIT_MAX_PODS", 10),
    maxQuestions: envInt("RATE_LIMIT_MAX_QUESTIONS", 30),
    podDailyQuota: envInt("POD_DAILY_QUOTA", 20),
  };
}

/** Test helper — clear all counters. */
export function resetRateLimits() {
  windows.clear();
  dailyPods.clear();
}

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function bumpWindow(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const cur = windows.get(key);
  if (!cur || now >= cur.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  cur.count += 1;
  if (cur.count > max) {
    const retrySec = Math.max(1, Math.ceil((cur.resetAt - now) / 1000));
    throw new AppError(
      429,
      "RATE_LIMITED",
      `Too many requests. Retry in ~${retrySec}s.`,
    );
  }
}

function bumpDailyPods(userId: string, quota: number) {
  const day = dayKey();
  const cur = dailyPods.get(userId);
  if (!cur || cur.day !== day) {
    dailyPods.set(userId, { count: 1, day });
    return;
  }
  cur.count += 1;
  if (cur.count > quota) {
    throw new AppError(
      429,
      "QUOTA_EXCEEDED",
      `Daily podcast create quota (${quota}) exceeded. Try again tomorrow.`,
    );
  }
}

export function assertPodCreateAllowed(userId: string) {
  const cfg = rateLimitConfig();
  bumpWindow(`pod:${userId}`, cfg.maxPods, cfg.windowMs);
  bumpDailyPods(userId, cfg.podDailyQuota);
}

export function assertQuestionAllowed(userId: string) {
  const cfg = rateLimitConfig();
  const maxQ = envInt("RATE_LIMIT_MAX_QUESTIONS", cfg.maxQuestions);
  bumpWindow(`q:${userId}`, maxQ, cfg.windowMs);
}
