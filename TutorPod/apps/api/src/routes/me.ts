import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { query } from "../db/pool.js";
import { AppError } from "../errors.js";

export async function meRoutes(app: FastifyInstance) {
  app.get("/api/v1/me", { preHandler: requireAuth }, async (req) => {
    const { rows } = await query<{
      id: string;
      email: string;
      name: string;
      standard_id: string | null;
      role: "student" | "admin";
      standard_name: string | null;
      standard_code: string | null;
    }>(
      `SELECT u.id, u.email, u.name, u.standard_id, u.role,
              s.name AS standard_name, s.code AS standard_code
       FROM users u
       LEFT JOIN standards s ON s.id = u.standard_id
       WHERE u.id=$1`,
      [req.user!.id],
    );
    const u = rows[0];
    if (!u) throw new AppError(404, "NOT_FOUND", "User not found");
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      standardId: u.standard_id,
      standard: u.standard_id
        ? { id: u.standard_id, name: u.standard_name, code: u.standard_code }
        : null,
    };
  });

  app.patch("/api/v1/me", { preHandler: requireAuth }, async (req) => {
    const body = z
      .object({
        name: z.string().min(1).max(80).optional(),
        standardId: z.string().uuid().optional(),
      })
      .parse(req.body);

    if (body.standardId) {
      const exists = await query(`SELECT 1 FROM standards WHERE id=$1`, [
        body.standardId,
      ]);
      if (!exists.rowCount) {
        throw new AppError(400, "VALIDATION", "Invalid standardId");
      }
    }

    const { rows } = await query<{
      id: string;
      email: string;
      name: string;
      standard_id: string | null;
      role: "student" | "admin";
    }>(
      `UPDATE users SET
         name = COALESCE($2, name),
         standard_id = COALESCE($3, standard_id)
       WHERE id=$1
       RETURNING id, email, name, standard_id, role`,
      [req.user!.id, body.name ?? null, body.standardId ?? null],
    );
    const u = rows[0];
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      standardId: u.standard_id,
    };
  });
}
