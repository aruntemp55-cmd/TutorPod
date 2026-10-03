import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { config } from "../config.js";
import { requireAuth } from "../auth/middleware.js";
import {
  newRefreshToken,
  signAccessToken,
} from "../auth/tokens.js";
import { query } from "../db/pool.js";
import { isProfileComplete } from "../domain/profile.js";
import { AppError } from "../errors.js";

type DbUser = {
  id: string;
  email: string;
  name: string;
  standard_id: string | null;
  role: "student" | "admin";
};

function publicUser(u: DbUser) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    standardId: u.standard_id,
    role: u.role,
    profileComplete: isProfileComplete({
      name: u.name,
      standard_id: u.standard_id,
      role: u.role,
    }),
  };
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/v1/auth/otp/request", async (req) => {
    const body = z.object({ email: z.string().email() }).parse(req.body);
    const email = body.email.toLowerCase();
    const code =
      config.nodeEnv === "production"
        ? String(Math.floor(100000 + Math.random() * 900000))
        : config.otpStubCode;
    const expires = new Date(Date.now() + 5 * 60 * 1000);
    await query(
      `INSERT INTO otp_codes (email, code, expires_at) VALUES ($1,$2,$3)
       ON CONFLICT (email) DO UPDATE SET code=$2, expires_at=$3`,
      [email, code, expires.toISOString()],
    );
    if (config.nodeEnv !== "production") {
      app.log.info({ email, code }, "OTP stub issued");
    }
    return { ok: true, expiresInSec: 300 };
  });

  app.post("/api/v1/auth/otp/verify", async (req) => {
    const body = z
      .object({ email: z.string().email(), code: z.string().min(4).max(8) })
      .parse(req.body);
    const email = body.email.toLowerCase();
    const { rows } = await query<{ code: string; expires_at: Date }>(
      `SELECT code, expires_at FROM otp_codes WHERE email=$1`,
      [email],
    );
    const row = rows[0];
    if (!row || row.code !== body.code || new Date(row.expires_at) < new Date()) {
      throw new AppError(401, "INVALID_OTP", "Invalid or expired code");
    }
    await query(`DELETE FROM otp_codes WHERE email=$1`, [email]);

    let user = (
      await query<DbUser>(
        `SELECT id, email, name, standard_id, role FROM users WHERE email=$1`,
        [email],
      )
    ).rows[0];

    if (!user) {
      // R025 — new students must complete Name + Standard on Settings
      user = (
        await query<DbUser>(
          `INSERT INTO users (email, name, standard_id, role) VALUES ($1,'',NULL,'student')
           RETURNING id, email, name, standard_id, role`,
          [email],
        )
      ).rows[0];
    }

    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = newRefreshToken();
    await query(
      `INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1,$2,$3)`,
      [
        refreshToken,
        user.id,
        new Date(Date.now() + config.refreshTtlSec * 1000).toISOString(),
      ],
    );

    return {
      accessToken,
      refreshToken,
      user: publicUser(user),
    };
  });

  app.post("/api/v1/auth/refresh", async (req) => {
    const body = z.object({ refreshToken: z.string() }).parse(req.body);
    const { rows } = await query<{ user_id: string; expires_at: Date }>(
      `SELECT user_id, expires_at FROM refresh_tokens WHERE token=$1`,
      [body.refreshToken],
    );
    const row = rows[0];
    if (!row || new Date(row.expires_at) < new Date()) {
      throw new AppError(401, "UNAUTHORIZED", "Invalid refresh token");
    }
    const user = (
      await query<DbUser>(
        `SELECT id, email, name, standard_id, role FROM users WHERE id=$1`,
        [row.user_id],
      )
    ).rows[0];
    if (!user) throw new AppError(401, "UNAUTHORIZED", "User not found");
    await query(`DELETE FROM refresh_tokens WHERE token=$1`, [body.refreshToken]);
    const refreshToken = newRefreshToken();
    await query(
      `INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1,$2,$3)`,
      [
        refreshToken,
        user.id,
        new Date(Date.now() + config.refreshTtlSec * 1000).toISOString(),
      ],
    );
    return {
      accessToken: signAccessToken({
        id: user.id,
        email: user.email,
        role: user.role,
      }),
      refreshToken,
      user: publicUser(user),
    };
  });

  app.post("/api/v1/auth/logout", { preHandler: requireAuth }, async (req) => {
    const body = z
      .object({ refreshToken: z.string().optional() })
      .parse(req.body ?? {});
    if (body.refreshToken) {
      await query(`DELETE FROM refresh_tokens WHERE token=$1`, [
        body.refreshToken,
      ]);
    }
    return { ok: true };
  });
}
