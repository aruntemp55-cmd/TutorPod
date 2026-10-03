import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../errors.js";
import { verifyAccessToken } from "./tokens.js";

export type AuthUser = {
  id: string;
  email: string;
  role: "student" | "admin";
};

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

function bearer(req: FastifyRequest): string | null {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7);
}

export async function requireAuth(
  req: FastifyRequest,
  _reply: FastifyReply,
) {
  const token = bearer(req);
  if (!token) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired token");
  }
}

/** Attach user when Bearer present; never 401 (guest OK). */
export async function optionalAuth(req: FastifyRequest, _reply: FastifyReply) {
  const token = bearer(req);
  if (!token) return;
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    /* ignore invalid token for optional auth */
  }
}

export async function requireAdmin(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  await requireAuth(req, reply);
  if (req.user?.role !== "admin") {
    throw new AppError(403, "FORBIDDEN", "Admin role required");
  }
}
