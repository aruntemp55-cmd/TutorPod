import { createReadStream, existsSync, statSync } from "node:fs";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { signStreamToken, verifyStreamToken } from "../auth/tokens.js";
import { config } from "../config.js";
import { query } from "../db/pool.js";
import { AppError } from "../errors.js";
import { generatePodcastAudio } from "../services/podcastAudio.js";
import { answerQuestion } from "../services/qa.js";
import {
  CONTEXT_TEXT_MAX,
  HOST_COUNT_MAX,
  HOST_COUNT_MIN,
  QUESTION_TEXT_MAX,
  QUESTION_TEXT_MIN,
} from "../domain/podLimits.js";
import {
  assertPodCreateAllowed,
  assertQuestionAllowed,
} from "../rateLimit.js";
import { audioPath, ensureCachedAudio, resolveLocalFile } from "../storage.js";

const podFinalizers: Promise<unknown>[] = [];

/** Await in-flight generating→ready jobs (tests / graceful shutdown). */
export async function waitForPodFinalizers() {
  await Promise.allSettled([...podFinalizers]);
  podFinalizers.length = 0;
}

async function getOwnedPod(podId: string, userId: string) {
  const { rows } = await query<{
    id: string;
    user_id: string;
    chapter_id: string;
    standard_id: string | null;
    section_id: string | null;
    title: string;
    host_count: number;
    context_text: string | null;
    status: string;
    audio_url: string | null;
    audio_storage_path: string | null;
    duration_sec: number | null;
    error_message: string | null;
    created_at: Date;
    ready_at: Date | null;
  }>(`SELECT * FROM pods WHERE id=$1`, [podId]);
  const pod = rows[0];
  if (!pod) throw new AppError(404, "NOT_FOUND", "Pod not found");
  if (pod.user_id !== userId) {
    throw new AppError(403, "FORBIDDEN", "Not your pod");
  }
  return pod;
}

function mapPod(
  pod: Awaited<ReturnType<typeof getOwnedPod>>,
  extras: {
    positionSec?: number;
    reaction?: string | null;
    chapterTitle?: string;
    streamUrl?: string;
  } = {},
) {
  return {
    id: pod.id,
    chapterId: pod.chapter_id,
    standardId: pod.standard_id,
    sectionId: pod.section_id,
    title: pod.title,
    hostCount: pod.host_count,
    contextText: pod.context_text,
    status: pod.status,
    /** Stream URL only when ready — generating/failed never expose playable audio */
    audioUrl:
      pod.status === "ready"
        ? (extras.streamUrl ?? pod.audio_url)
        : null,
    streamPath: `/api/v1/pods/${pod.id}/audio`,
    durationSec: pod.duration_sec,
    errorMessage: pod.error_message,
    createdAt: pod.created_at,
    readyAt: pod.ready_at,
    positionSec: extras.positionSec ?? 0,
    reaction: extras.reaction ?? null,
    chapterTitle: extras.chapterTitle,
  };
}

export async function podRoutes(app: FastifyInstance) {
  app.post("/api/v1/pods", { preHandler: requireAuth }, async (req) => {
    assertPodCreateAllowed(req.user!.id);
    const body = z
      .object({
        standardId: z.string().uuid(),
        sectionId: z.string().uuid(),
        chapterId: z.string().uuid(),
        hostCount: z.number().int().min(HOST_COUNT_MIN).max(HOST_COUNT_MAX),
        contextText: z.string().max(CONTEXT_TEXT_MAX).optional(),
      })
      .parse(req.body);

    const chapter = (
      await query<{
        id: string;
        title: string;
        synopsis: string | null;
        subject_id: string;
        standard_id: string;
      }>(
        `SELECT c.id, c.title, c.synopsis, c.subject_id, s.standard_id
         FROM chapters c
         JOIN subjects s ON s.id = c.subject_id
         WHERE c.id=$1`,
        [body.chapterId],
      )
    ).rows[0];
    if (!chapter) throw new AppError(404, "NOT_FOUND", "Chapter not found");
    if (
      chapter.subject_id !== body.sectionId ||
      chapter.standard_id !== body.standardId
    ) {
      throw new AppError(
        400,
        "VALIDATION",
        "standardId/sectionId/chapterId hierarchy mismatch",
      );
    }

    const variant = (
      await query<{ audio_url: string; duration_sec: number; title: string }>(
        `SELECT audio_url, duration_sec, title FROM seed_audio_variants
         WHERE chapter_id=$1 AND host_count=$2`,
        [body.chapterId, body.hostCount],
      )
    ).rows[0];

    const sourceUrl = variant?.audio_url ?? config.sampleAudioUrl;
    const cacheKey = `${body.chapterId}-${body.hostCount}`;
    const durationSec = variant?.duration_sec ?? 1482;
    const title = variant?.title ?? chapter.title;

    // T032 — generating; OpenAI multi-host TTS when keyed, else sample cache
    const { rows } = await query(
      `INSERT INTO pods
         (user_id, chapter_id, standard_id, section_id, title, host_count, context_text,
          status, audio_url, audio_storage_path, duration_sec, error_message, ready_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'generating',$8,NULL,$9,NULL,NULL)
       RETURNING *`,
      [
        req.user!.id,
        body.chapterId,
        body.standardId,
        body.sectionId,
        title,
        body.hostCount,
        body.contextText ?? null,
        sourceUrl,
        durationSec,
      ],
    );
    const pod = rows[0] as Awaited<ReturnType<typeof getOwnedPod>>;

    const finalize = (async () => {
      await new Promise((r) =>
        setTimeout(
          r,
          Number(process.env.POD_GENERATE_DELAY_MS ?? config.podGenerateDelayMs),
        ),
      );
      try {
        const audio = await generatePodcastAudio({
          storageKey: pod.id,
          chapterTitle: chapter.title,
          synopsis: chapter.synopsis ?? null,
          contextText: body.contextText ?? null,
          hostCount: body.hostCount,
          fallbackSourceUrl: sourceUrl,
        });
        await query(
          `UPDATE pods SET status='ready', audio_storage_path=$2, duration_sec=$3,
             title=COALESCE($4, title), ready_at=now(), error_message=NULL WHERE id=$1`,
          [pod.id, audio.storageRel, audio.durationSec, audio.title ?? null],
        );
      } catch (e) {
        await query(
          `UPDATE pods SET status='failed', error_message=$2 WHERE id=$1`,
          [pod.id, e instanceof Error ? e.message : "Audio generation failed"],
        );
      }
    })();
    podFinalizers.push(finalize);

    return mapPod(pod, {
      chapterTitle: chapter.title,
      // no stream URL until ready — client polls /status
      streamUrl: undefined,
    });
  });

  app.get("/api/v1/pods", { preHandler: requireAuth }, async (req) => {
    const q = req.query as { cursor?: string; limit?: string; status?: string };
    const limit = Math.min(Number(q.limit ?? 20), 50);
    const params: unknown[] = [req.user!.id];
    let sql = `
      SELECT p.*, c.title AS chapter_title,
             COALESCE(pp.position_sec, 0) AS position_sec,
             pr.value AS reaction
      FROM pods p
      JOIN chapters c ON c.id = p.chapter_id
      LEFT JOIN pod_progress pp ON pp.pod_id = p.id AND pp.user_id = p.user_id
      LEFT JOIN pod_reactions pr ON pr.pod_id = p.id AND pr.user_id = p.user_id
      WHERE p.user_id=$1`;
    if (q.status) {
      params.push(q.status);
      sql += ` AND p.status=$${params.length}`;
    }
    if (q.cursor) {
      params.push(q.cursor);
      sql += ` AND p.created_at < $${params.length}::timestamptz`;
    }
    params.push(limit);
    sql += ` ORDER BY p.created_at DESC LIMIT $${params.length}`;

    const { rows } = await query(sql, params);
    const items = rows.map((r) => {
      const pod = r as Awaited<ReturnType<typeof getOwnedPod>>;
      const token = signStreamToken(pod.id, req.user!.id);
      return mapPod(pod, {
        positionSec: Number((r as { position_sec: number }).position_sec),
        reaction: (r as { reaction: string | null }).reaction,
        chapterTitle: (r as { chapter_title: string }).chapter_title,
        streamUrl: `${config.publicBaseUrl}/api/v1/pods/${pod.id}/audio?token=${token}`,
      });
    });
    const nextCursor =
      items.length === limit
        ? String(items[items.length - 1].createdAt)
        : null;
    return { items, nextCursor };
  });

  app.get<{ Params: { podId: string } }>(
    "/api/v1/pods/:podId",
    { preHandler: requireAuth },
    async (req) => {
      const pod = await getOwnedPod(req.params.podId, req.user!.id);
      const progress = (
        await query<{ position_sec: number }>(
          `SELECT position_sec FROM pod_progress WHERE pod_id=$1 AND user_id=$2`,
          [pod.id, req.user!.id],
        )
      ).rows[0];
      const reaction = (
        await query<{ value: string }>(
          `SELECT value FROM pod_reactions WHERE pod_id=$1 AND user_id=$2`,
          [pod.id, req.user!.id],
        )
      ).rows[0];
      const chapter = (
        await query<{ title: string }>(
          `SELECT title FROM chapters WHERE id=$1`,
          [pod.chapter_id],
        )
      ).rows[0];
      const token = signStreamToken(pod.id, req.user!.id);
      return mapPod(pod, {
        positionSec: progress?.position_sec ?? 0,
        reaction: reaction?.value ?? null,
        chapterTitle: chapter?.title,
        streamUrl: `${config.publicBaseUrl}/api/v1/pods/${pod.id}/audio?token=${token}`,
      });
    },
  );

  /** Authenticated audio stream (Bearer or ?token= stream JWT). */
  app.get<{ Params: { podId: string }; Querystring: { token?: string } }>(
    "/api/v1/pods/:podId/audio",
    async (req, reply) => {
      let userId: string | undefined = req.user?.id;
      const qToken = req.query.token;
      if (qToken) {
        try {
          const st = verifyStreamToken(qToken);
          if (st.podId !== req.params.podId) {
            throw new AppError(403, "FORBIDDEN", "Token pod mismatch");
          }
          userId = st.userId;
        } catch {
          throw new AppError(401, "UNAUTHORIZED", "Invalid stream token");
        }
      } else {
        await requireAuth(req, reply);
        userId = req.user!.id;
      }

      const pod = await getOwnedPod(req.params.podId, userId!);
      if (pod.status !== "ready") {
        throw new AppError(409, "NOT_READY", "Audio not ready");
      }

      let file: string | null = null;
      if (pod.audio_storage_path) {
        try {
          file = await resolveLocalFile("audio", pod.audio_storage_path);
        } catch {
          file = existsSync(audioPath(pod.audio_storage_path))
            ? audioPath(pod.audio_storage_path)
            : null;
        }
      }
      if (!file || !existsSync(file)) {
        const key = `${pod.chapter_id}-${pod.host_count}`;
        file = await ensureCachedAudio(
          key,
          pod.audio_url ?? config.sampleAudioUrl,
        );
        await query(`UPDATE pods SET audio_storage_path=$2 WHERE id=$1`, [
          pod.id,
          `${key}.mp3`,
        ]);
      }

      const stat = statSync(file);
      const range = req.headers.range;
      reply.header("Content-Type", "audio/mpeg");
      reply.header("Accept-Ranges", "bytes");
      reply.header("Cache-Control", "private, max-age=3600");

      if (range) {
        const m = /bytes=(\d+)-(\d*)/.exec(range);
        if (m) {
          const start = Number(m[1]);
          const end = m[2] ? Number(m[2]) : stat.size - 1;
          reply.code(206);
          reply.header("Content-Range", `bytes ${start}-${end}/${stat.size}`);
          reply.header("Content-Length", String(end - start + 1));
          return reply.send(createReadStream(file, { start, end }));
        }
      }

      reply.header("Content-Length", String(stat.size));
      return reply.send(createReadStream(file));
    },
  );

  app.get<{ Params: { podId: string } }>(
    "/api/v1/pods/:podId/status",
    { preHandler: requireAuth },
    async (req) => {
      const pod = await getOwnedPod(req.params.podId, req.user!.id);
      const token = signStreamToken(pod.id, req.user!.id);
      const ready = pod.status === "ready";
      return {
        id: pod.id,
        status: pod.status,
        audioUrl: ready
          ? `${config.publicBaseUrl}/api/v1/pods/${pod.id}/audio?token=${token}`
          : null,
        durationSec: pod.duration_sec,
        errorMessage: pod.error_message,
      };
    },
  );

  app.put<{ Params: { podId: string } }>(
    "/api/v1/pods/:podId/progress",
    { preHandler: requireAuth },
    async (req) => {
      const body = z.object({ positionSec: z.number().min(0) }).parse(req.body);
      await getOwnedPod(req.params.podId, req.user!.id);
      await query(
        `INSERT INTO pod_progress (pod_id, user_id, position_sec, updated_at)
         VALUES ($1,$2,$3,now())
         ON CONFLICT (pod_id) DO UPDATE SET position_sec=$3, updated_at=now()`,
        [req.params.podId, req.user!.id, body.positionSec],
      );
      return { ok: true, positionSec: body.positionSec };
    },
  );

  app.put<{ Params: { podId: string } }>(
    "/api/v1/pods/:podId/reaction",
    { preHandler: requireAuth },
    async (req) => {
      const body = z
        .object({ value: z.enum(["like", "dislike"]).nullable() })
        .parse(req.body);
      await getOwnedPod(req.params.podId, req.user!.id);
      if (body.value === null) {
        await query(
          `DELETE FROM pod_reactions WHERE pod_id=$1 AND user_id=$2`,
          [req.params.podId, req.user!.id],
        );
        return { value: null };
      }
      await query(
        `INSERT INTO pod_reactions (pod_id, user_id, value, updated_at)
         VALUES ($1,$2,$3,now())
         ON CONFLICT (pod_id, user_id) DO UPDATE SET value=$3, updated_at=now()`,
        [req.params.podId, req.user!.id, body.value],
      );
      return { value: body.value };
    },
  );

  app.get<{ Params: { podId: string } }>(
    "/api/v1/pods/:podId/share",
    { preHandler: requireAuth },
    async (req) => {
      const pod = await getOwnedPod(req.params.podId, req.user!.id);
      const url = `${config.deepLinkBase}/pod/${pod.id}`;
      return {
        url,
        title: pod.title,
        chapterId: pod.chapter_id,
        deepLink: `tutorpod://pod/${pod.id}`,
      };
    },
  );

  app.post<{ Params: { podId: string } }>(
    "/api/v1/pods/:podId/questions",
    { preHandler: requireAuth },
    async (req) => {
      assertQuestionAllowed(req.user!.id);
      const body = z
        .object({ questionText: z.string().min(QUESTION_TEXT_MIN).max(QUESTION_TEXT_MAX) })
        .parse(req.body);
      const pod = await getOwnedPod(req.params.podId, req.user!.id);
      const chapter = (
        await query<{ title: string; synopsis: string | null }>(
          `SELECT title, synopsis FROM chapters WHERE id=$1`,
          [pod.chapter_id],
        )
      ).rows[0];

      const inserted = (
        await query<{ id: string }>(
          `INSERT INTO questions (pod_id, user_id, question_text, status)
           VALUES ($1,$2,$3,'pending') RETURNING id`,
          [pod.id, req.user!.id, body.questionText],
        )
      ).rows[0];

      try {
        const answer = await answerQuestion({
          questionText: body.questionText,
          chapterTitle: chapter?.title ?? pod.title,
          synopsis: chapter?.synopsis ?? null,
          contextText: pod.context_text,
        });
        const { rows } = await query(
          `UPDATE questions SET status='answered', answer_text=$2, answered_at=now()
           WHERE id=$1
           RETURNING id, pod_id AS "podId", question_text AS "questionText",
                     answer_text AS "answerText", status, created_at AS "createdAt",
                     answered_at AS "answeredAt"`,
          [inserted.id, answer],
        );
        return rows[0];
      } catch {
        const { rows } = await query(
          `UPDATE questions SET status='failed', answer_text=$2, answered_at=now()
           WHERE id=$1
           RETURNING id, pod_id AS "podId", question_text AS "questionText",
                     answer_text AS "answerText", status, created_at AS "createdAt",
                     answered_at AS "answeredAt"`,
          [
            inserted.id,
            "Sorry — the tutor is unavailable right now. Please try again.",
          ],
        );
        return rows[0];
      }
    },
  );

  app.get<{ Params: { podId: string } }>(
    "/api/v1/pods/:podId/questions",
    { preHandler: requireAuth },
    async (req) => {
      await getOwnedPod(req.params.podId, req.user!.id);
      const limit = Math.min(
        Number((req.query as { limit?: string }).limit ?? 20),
        50,
      );
      const { rows } = await query(
        `SELECT id, pod_id AS "podId", question_text AS "questionText",
                answer_text AS "answerText", status,
                created_at AS "createdAt", answered_at AS "answeredAt"
         FROM questions WHERE pod_id=$1
         ORDER BY created_at DESC LIMIT $2`,
        [req.params.podId, limit],
      );
      return { items: rows };
    },
  );
}
