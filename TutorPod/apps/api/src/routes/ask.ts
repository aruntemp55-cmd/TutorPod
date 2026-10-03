import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { query } from "../db/pool.js";
import { AppError } from "../errors.js";
import { assertQuestionAllowed } from "../rateLimit.js";
import { answerAsk } from "../services/ask.js";

export async function askRoutes(app: FastifyInstance) {
  app.post("/api/v1/ask", { preHandler: requireAuth }, async (req) => {
    assertQuestionAllowed(req.user!.id);
    const body = z
      .object({
        message: z.string().trim().min(1).max(2000),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string().max(4000),
            }),
          )
          .max(20)
          .optional(),
      })
      .parse(req.body);

    const me = (
      await query<{ name: string; standard_name: string | null }>(
        `SELECT u.name, s.name AS standard_name
         FROM users u
         LEFT JOIN standards s ON s.id = u.standard_id
         WHERE u.id=$1`,
        [req.user!.id],
      )
    ).rows[0];
    if (!me) throw new AppError(404, "NOT_FOUND", "User not found");

    try {
      const answer = await answerAsk({
        message: body.message,
        history: body.history,
        studentName: me.name,
        standardName: me.standard_name,
      });
      return {
        answer,
        provider: process.env.OPENAI_API_KEY?.trim() ? "openai" : "stub",
      };
    } catch {
      throw new AppError(
        503,
        "AI_UNAVAILABLE",
        "Tutor is unavailable right now. Please try again.",
      );
    }
  });
}
