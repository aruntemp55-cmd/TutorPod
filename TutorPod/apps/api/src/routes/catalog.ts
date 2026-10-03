import type { FastifyInstance } from "fastify";
import { requireAuth } from "../auth/middleware.js";
import { query } from "../db/pool.js";
import { AppError } from "../errors.js";

/** Catalog: Standard → Section (DB subjects) → Chapter. Guest browse OK. */
export async function catalogRoutes(app: FastifyInstance) {
  app.get("/api/v1/catalog/standards", async () => {
    const { rows } = await query(
      `SELECT id, code, name, board FROM standards ORDER BY code`,
    );
    return { items: rows };
  });

  // Preferred v2 path
  app.get<{ Params: { standardId: string } }>(
    "/api/v1/catalog/standards/:standardId/sections",
    async (req) => {
      const { rows } = await query(
        `SELECT id, standard_id AS "standardId", name, slug
         FROM subjects WHERE standard_id=$1 ORDER BY name`,
        [req.params.standardId],
      );
      return { items: rows };
    },
  );

  // Back-compat alias
  app.get<{ Params: { standardId: string } }>(
    "/api/v1/catalog/standards/:standardId/subjects",
    async (req) => {
      const { rows } = await query(
        `SELECT id, standard_id AS "standardId", name, slug
         FROM subjects WHERE standard_id=$1 ORDER BY name`,
        [req.params.standardId],
      );
      return { items: rows };
    },
  );

  app.get<{ Params: { sectionId: string }; Querystring: { pathId?: string } }>(
    "/api/v1/catalog/sections/:sectionId/chapters",
    async (req, reply) => {
      const pathId = req.query.pathId;
      if (pathId) {
        await requireAuth(req, reply);
        const { rows } = await query(
          `SELECT c.id, c.subject_id AS "sectionId", c.title, c.synopsis,
                  c.image_url AS "imageUrl", c.sort_order AS "sortOrder",
                  c.source_count AS "sourceCount", lpi.position
           FROM learning_path_items lpi
           JOIN chapters c ON c.id = lpi.chapter_id
           JOIN learning_paths lp ON lp.id = lpi.learning_path_id
           WHERE lpi.learning_path_id=$1 AND lp.subject_id=$2
           ORDER BY lpi.position`,
          [pathId, req.params.sectionId],
        );
        return { items: rows };
      }
      const { rows } = await query(
        `SELECT id, subject_id AS "sectionId", title, synopsis,
                image_url AS "imageUrl", sort_order AS "sortOrder",
                source_count AS "sourceCount"
         FROM chapters WHERE subject_id=$1 ORDER BY sort_order`,
        [req.params.sectionId],
      );
      return { items: rows };
    },
  );

  app.get<{ Params: { subjectId: string }; Querystring: { pathId?: string } }>(
    "/api/v1/catalog/subjects/:subjectId/chapters",
    async (req, reply) => {
      const sectionId = req.params.subjectId;
      const pathId = req.query.pathId;
      if (pathId) await requireAuth(req, reply);
      const { rows } = await query(
        pathId
          ? `SELECT c.id, c.subject_id AS "sectionId", c.title, c.synopsis,
                    c.image_url AS "imageUrl", c.sort_order AS "sortOrder",
                    c.source_count AS "sourceCount", lpi.position
             FROM learning_path_items lpi
             JOIN chapters c ON c.id = lpi.chapter_id
             WHERE lpi.learning_path_id=$1 AND c.subject_id=$2
             ORDER BY lpi.position`
          : `SELECT id, subject_id AS "sectionId", title, synopsis,
                    image_url AS "imageUrl", sort_order AS "sortOrder",
                    source_count AS "sourceCount"
             FROM chapters WHERE subject_id=$1 ORDER BY sort_order`,
        pathId ? [pathId, sectionId] : [sectionId],
      );
      return { items: rows };
    },
  );

  /** T075 — public teaser (names/descriptions); select still auth-gated. */
  app.get<{ Params: { sectionId: string } }>(
    "/api/v1/catalog/sections/:sectionId/learning-paths",
    async (req) => {
      const { rows } = await query(
        `SELECT id, subject_id AS "sectionId", name, description
         FROM learning_paths WHERE subject_id=$1 ORDER BY name`,
        [req.params.sectionId],
      );
      return { items: rows, teaser: true };
    },
  );

  app.get<{ Params: { subjectId: string } }>(
    "/api/v1/catalog/subjects/:subjectId/learning-paths",
    async (req) => {
      const { rows } = await query(
        `SELECT id, subject_id AS "sectionId", name, description
         FROM learning_paths WHERE subject_id=$1 ORDER BY name`,
        [req.params.subjectId],
      );
      return { items: rows, teaser: true };
    },
  );

  app.get<{ Params: { pathId: string } }>(
    "/api/v1/catalog/learning-paths/:pathId",
    { preHandler: requireAuth },
    async (req) => {
      const path = (
        await query(
          `SELECT id, subject_id AS "sectionId", name, description
           FROM learning_paths WHERE id=$1`,
          [req.params.pathId],
        )
      ).rows[0];
      if (!path) throw new AppError(404, "NOT_FOUND", "Learning path not found");
      const { rows: chapters } = await query(
        `SELECT c.id, c.title, c.synopsis, c.image_url AS "imageUrl",
                c.source_count AS "sourceCount", lpi.position
         FROM learning_path_items lpi
         JOIN chapters c ON c.id = lpi.chapter_id
         WHERE lpi.learning_path_id=$1
         ORDER BY lpi.position`,
        [req.params.pathId],
      );
      return { ...path, chapters };
    },
  );

  app.get("/api/v1/me/learning-paths", { preHandler: requireAuth }, async (req) => {
    const { rows } = await query(
      `SELECT user_id AS "userId", subject_id AS "sectionId",
              learning_path_id AS "learningPathId", updated_at AS "updatedAt"
       FROM learning_path_selections WHERE user_id=$1`,
      [req.user!.id],
    );
    return { items: rows };
  });

  app.put<{ Params: { sectionId: string } }>(
    "/api/v1/me/learning-paths/:sectionId",
    { preHandler: requireAuth },
    async (req) => {
      const body = req.body as { learningPathId?: string };
      if (!body?.learningPathId) {
        throw new AppError(400, "VALIDATION", "learningPathId required");
      }
      const path = (
        await query(
          `SELECT id FROM learning_paths WHERE id=$1 AND subject_id=$2`,
          [body.learningPathId, req.params.sectionId],
        )
      ).rows[0];
      if (!path) {
        throw new AppError(404, "NOT_FOUND", "Path not in section");
      }
      const { rows } = await query(
        `INSERT INTO learning_path_selections (user_id, subject_id, learning_path_id, updated_at)
         VALUES ($1,$2,$3,now())
         ON CONFLICT (user_id, subject_id)
         DO UPDATE SET learning_path_id=$3, updated_at=now()
         RETURNING user_id AS "userId", subject_id AS "sectionId",
                   learning_path_id AS "learningPathId", updated_at AS "updatedAt"`,
        [req.user!.id, req.params.sectionId, body.learningPathId],
      );
      return rows[0];
    },
  );
}
