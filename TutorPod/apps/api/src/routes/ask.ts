import type { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { query } from "../db/pool.js";
import { AppError } from "../errors.js";
import { assertQuestionAllowed } from "../rateLimit.js";
import { answerAsk } from "../services/ask.js";
import { SttError, transcribeAudio } from "../services/stt.js";

const AUDIO_MAX_BYTES = 10 * 1024 * 1024;

export async function askRoutes(app: FastifyInstance) {
  await app.register(async (ask) => {
    await ask.register(multipart, {
      limits: { fileSize: AUDIO_MAX_BYTES, files: 1 },
    });

    ask.post("/api/v1/ask", { preHandler: requireAuth }, async (req) => {
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

    ask.post(
      "/api/v1/ask/transcribe",
      { preHandler: requireAuth },
      async (req) => {
        const file = await req.file();
        if (!file) {
          throw new AppError(400, "VALIDATION", "Audio file required (field: file)");
        }

        const name = (file.filename || "audio.m4a").toLowerCase();
        const mime = (file.mimetype || "").toLowerCase();
        const looksAudio =
          mime.startsWith("audio/") ||
          mime === "application/octet-stream" ||
          /\.(m4a|mp3|wav|webm|ogg|caf|3gp|mp4)$/.test(name);
        if (!looksAudio) {
          throw new AppError(
            400,
            "VALIDATION",
            "Upload an audio recording (m4a/mp3/wav/webm)",
          );
        }

        let buffer: Buffer;
        try {
          buffer = await file.toBuffer();
        } catch {
          throw new AppError(
            400,
            "VALIDATION",
            "Audio too large or unreadable (max 10MB)",
          );
        }
        if (!buffer.length) {
          throw new AppError(400, "VALIDATION", "Empty audio file");
        }

        try {
          // Shared by Ask (R027) and Raise-hand voice (R009) composers.
          const result = await transcribeAudio({
            buffer,
            filename: file.filename || "audio.m4a",
            mimeType: file.mimetype || "audio/mp4",
          });
          return {
            transcript: result.transcript,
            provider: result.provider,
          };
        } catch (e) {
          if (e instanceof SttError) {
            throw new AppError(503, e.code, e.message);
          }
          throw new AppError(
            503,
            "STT_FAILED",
            "Could not transcribe audio. Type your question instead.",
          );
        }
      },
    );
  });
}
