import type { FastifyInstance } from "fastify";
import { optionalAuth } from "../auth/middleware.js";
import { query } from "../db/pool.js";

/** T070 — search standards / sections / chapters (+ MyPods when authed). */
export async function searchRoutes(app: FastifyInstance) {
  app.get("/api/v1/search", { preHandler: optionalAuth }, async (req) => {
    const q = String((req.query as { q?: string }).q ?? "").trim();
    const limit = Math.min(
      Number((req.query as { limit?: string }).limit ?? 20),
      50,
    );
    if (q.length < 1) {
      return {
        query: q,
        standards: [],
        sections: [],
        chapters: [],
        pods: [],
      };
    }

    const like = `%${q.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;

    const [standards, sections, chapters] = await Promise.all([
      query(
        `SELECT id, code, name, board FROM standards
         WHERE name ILIKE $1 OR code ILIKE $1
         ORDER BY code LIMIT $2`,
        [like, limit],
      ),
      query(
        `SELECT id, standard_id AS "standardId", name, slug
         FROM subjects
         WHERE name ILIKE $1 OR slug ILIKE $1
         ORDER BY name LIMIT $2`,
        [like, limit],
      ),
      query(
        `SELECT id, subject_id AS "sectionId", title, synopsis,
                image_url AS "imageUrl", sort_order AS "sortOrder",
                source_count AS "sourceCount"
         FROM chapters
         WHERE title ILIKE $1 OR synopsis ILIKE $1
         ORDER BY sort_order LIMIT $2`,
        [like, limit],
      ),
    ]);

    let pods: unknown[] = [];
    if (req.user?.id) {
      const podRes = await query(
        `SELECT id, title, status, chapter_id AS "chapterId",
                host_count AS "hostCount", duration_sec AS "durationSec",
                created_at AS "createdAt"
         FROM pods
         WHERE user_id=$1 AND (title ILIKE $2)
         ORDER BY created_at DESC LIMIT $3`,
        [req.user.id, like, limit],
      );
      pods = podRes.rows;
    }

    return {
      query: q,
      standards: standards.rows,
      sections: sections.rows,
      chapters: chapters.rows,
      pods,
    };
  });
}
