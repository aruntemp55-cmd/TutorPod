import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { config } from "../config.js";

export type AccessPayload = {
  sub: string;
  email: string;
  role: "student" | "admin";
};

export function signAccessToken(user: {
  id: string;
  email: string;
  role: "student" | "admin";
}) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    } satisfies AccessPayload,
    config.jwtSecret,
    { expiresIn: config.accessTtlSec },
  );
}

export function verifyAccessToken(token: string): AccessPayload {
  const payload = jwt.verify(token, config.jwtSecret) as AccessPayload;
  return {
    sub: payload.sub,
    email: payload.email,
    role: payload.role === "admin" ? "admin" : "student",
  };
}

export function newRefreshToken() {
  return randomBytes(32).toString("hex");
}

/** Short-lived token for audio streaming (query param). */
export function signStreamToken(podId: string, userId: string) {
  return jwt.sign({ podId, userId, typ: "stream" }, config.jwtSecret, {
    expiresIn: 60 * 60,
  });
}

export function verifyStreamToken(token: string): {
  podId: string;
  userId: string;
} {
  const p = jwt.verify(token, config.jwtSecret) as {
    podId: string;
    userId: string;
    typ?: string;
  };
  if (p.typ !== "stream") throw new Error("invalid stream token");
  return { podId: p.podId, userId: p.userId };
}
