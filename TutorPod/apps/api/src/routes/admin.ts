import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { z } from "zod";
import { requireAdmin } from "../auth/middleware.js";
import { query } from "../db/pool.js";
import { AppError } from "../errors.js";
import { generateChaptersFromPdf } from "../services/chapterGen.js";
import { ensureStorage, mirrorToRemote, pdfPath } from "../storage.js";

const CHEM_IMAGE =
  "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=200&h=200&fit=crop";

export async function adminRoutes(app: FastifyInstance) {
  await app.register(async (admin) => {
  await admin.register(multipart, {
    limits: { fileSize: 25 * 1024 * 1024 },
  });

  admin.addHook("preHandler", requireAdmin);

  admin.get("/api/v1/admin/standards", async () => {
    const { rows } = await query(
      `SELECT id, code, name, board FROM standards ORDER BY code`,
    );
    return { items: rows };
  });

  admin.post("/api/v1/admin/standards", async (req) => {
    const body = z
      .object({
        code: z.string().min(1).max(40),
        name: z.string().min(1).max(80),
        board: z.string().min(1).max(40).default("CBSE"),
      })
      .parse(req.body);
    const { rows } = await query(
      `INSERT INTO standards (code, name, board) VALUES ($1,$2,$3)
       RETURNING id, code, name, board`,
      [body.code, body.name, body.board],
    );
    return rows[0];
  });

  admin.patch<{ Params: { id: string } }>(
    "/api/v1/admin/standards/:id",
    async (req) => {
      const body = z
        .object({
          code: z.string().min(1).max(40).optional(),
          name: z.string().min(1).max(80).optional(),
          board: z.string().min(1).max(40).optional(),
        })
        .parse(req.body);
      const { rows } = await query(
        `UPDATE standards SET
           code = COALESCE($2, code),
           name = COALESCE($3, name),
           board = COALESCE($4, board)
         WHERE id=$1
         RETURNING id, code, name, board`,
        [req.params.id, body.code ?? null, body.name ?? null, body.board ?? null],
      );
      if (!rows[0]) throw new AppError(404, "NOT_FOUND", "Standard not found");
      return rows[0];
    },
  );

  admin.delete<{ Params: { id: string } }>(
    "/api/v1/admin/standards/:id",
    async (req) => {
      const r = await query(`DELETE FROM standards WHERE id=$1`, [req.params.id]);
      if (!r.rowCount) throw new AppError(404, "NOT_FOUND", "Standard not found");
      return { ok: true };
    },
  );

  admin.get<{ Params: { standardId: string } }>(
    "/api/v1/admin/standards/:standardId/sections",
    async (req) => {
      const { rows } = await query(
        `SELECT id, standard_id AS "standardId", name, slug
         FROM subjects WHERE standard_id=$1 ORDER BY name`,
        [req.params.standardId],
      );
      return { items: rows };
    },
  );

  admin.post<{ Params: { standardId: string } }>(
    "/api/v1/admin/standards/:standardId/sections",
    async (req) => {
      const body = z
        .object({
          name: z.string().min(1).max(80),
          slug: z.string().min(1).max(80).optional(),
        })
        .parse(req.body);
      const slug =
        body.slug ??
        body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { rows } = await query(
        `INSERT INTO subjects (standard_id, name, slug) VALUES ($1,$2,$3)
         RETURNING id, standard_id AS "standardId", name, slug`,
        [req.params.standardId, body.name, slug],
      );
      return rows[0];
    },
  );

  admin.patch<{ Params: { id: string } }>(
    "/api/v1/admin/sections/:id",
    async (req) => {
      const body = z
        .object({
          name: z.string().min(1).max(80).optional(),
          slug: z.string().min(1).max(80).optional(),
        })
        .parse(req.body);
      const { rows } = await query(
        `UPDATE subjects SET
           name = COALESCE($2, name),
           slug = COALESCE($3, slug)
         WHERE id=$1
         RETURNING id, standard_id AS "standardId", name, slug`,
        [req.params.id, body.name ?? null, body.slug ?? null],
      );
      if (!rows[0]) throw new AppError(404, "NOT_FOUND", "Section not found");
      return rows[0];
    },
  );

  admin.delete<{ Params: { id: string } }>(
    "/api/v1/admin/sections/:id",
    async (req) => {
      const r = await query(`DELETE FROM subjects WHERE id=$1`, [req.params.id]);
      if (!r.rowCount) throw new AppError(404, "NOT_FOUND", "Section not found");
      return { ok: true };
    },
  );

  admin.get<{ Params: { sectionId: string } }>(
    "/api/v1/admin/sections/:sectionId/pdfs",
    async (req) => {
      const { rows } = await query(
        `SELECT id, section_id AS "sectionId", original_name AS "originalName",
                byte_size AS "byteSize", created_at AS "createdAt"
         FROM section_pdfs WHERE section_id=$1 ORDER BY created_at DESC`,
        [req.params.sectionId],
      );
      return { items: rows };
    },
  );

  admin.post<{ Params: { sectionId: string } }>(
    "/api/v1/admin/sections/:sectionId/pdf",
    async (req) => {
      const section = (
        await query<{ id: string; name: string }>(
          `SELECT id, name FROM subjects WHERE id=$1`,
          [req.params.sectionId],
        )
      ).rows[0];
      if (!section) throw new AppError(404, "NOT_FOUND", "Section not found");

      const file = await req.file();
      if (!file) throw new AppError(400, "VALIDATION", "PDF file required");
      if (!file.mimetype.includes("pdf") && !file.filename.toLowerCase().endsWith(".pdf")) {
        throw new AppError(400, "VALIDATION", "Only PDF uploads allowed");
      }

      ensureStorage();
      const id = randomUUID();
      const stored = `${id}.pdf`;
      const dest = pdfPath(stored);
      await pipeline(file.file, createWriteStream(dest));
      try {
        await mirrorToRemote("pdfs", stored);
      } catch (e) {
        req.log.warn(
          { err: e },
          "S3 PDF mirror failed; kept local storage",
        );
      }

      const { rows } = await query(
        `INSERT INTO section_pdfs (id, section_id, original_name, storage_path, byte_size)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id, section_id AS "sectionId", original_name AS "originalName",
                   byte_size AS "byteSize", created_at AS "createdAt"`,
        [id, section.id, file.filename, stored, file.file.bytesRead || 0],
      );
      return rows[0];
    },
  );

  admin.post<{ Params: { sectionId: string } }>(
    "/api/v1/admin/sections/:sectionId/generate-chapters",
    async (req) => {
      const body = z.object({ pdfId: z.string().uuid() }).parse(req.body);
      const section = (
        await query<{ id: string; name: string }>(
          `SELECT id, name FROM subjects WHERE id=$1`,
          [req.params.sectionId],
        )
      ).rows[0];
      if (!section) throw new AppError(404, "NOT_FOUND", "Section not found");
      const pdf = (
        await query<{
          id: string;
          original_name: string;
          section_id: string;
          storage_path: string;
        }>(
          `SELECT id, original_name, section_id, storage_path FROM section_pdfs WHERE id=$1`,
          [body.pdfId],
        )
      ).rows[0];
      if (!pdf || pdf.section_id !== section.id) {
        throw new AppError(404, "NOT_FOUND", "PDF not found for section");
      }

      const gen = await generateChaptersFromPdf({
        pdfAbsolutePath: pdfPath(pdf.storage_path),
        pdfName: pdf.original_name,
        sectionName: section.name,
      });
      const generated = gen.chapters;

      const maxOrder = (
        await query<{ m: number }>(
          `SELECT COALESCE(MAX(sort_order),0) AS m FROM chapters WHERE subject_id=$1`,
          [section.id],
        )
      ).rows[0].m;

      const created = [];
      for (const [i, ch] of generated.entries()) {
        const { rows } = await query(
          `INSERT INTO chapters
             (subject_id, title, synopsis, image_url, sort_order, source_count, section_pdf_id)
           VALUES ($1,$2,$3,$4,$5,1,$6)
           RETURNING id, subject_id AS "sectionId", title, synopsis,
                     image_url AS "imageUrl", sort_order AS "sortOrder",
                     section_pdf_id AS "sectionPdfId"`,
          [
            section.id,
            ch.title,
            ch.synopsis,
            CHEM_IMAGE,
            maxOrder + i + 1,
            pdf.id,
          ],
        );
        created.push(rows[0]);
      }
      return { items: created, stub: gen.stub, provider: gen.provider };
    },
  );

  admin.get<{ Params: { sectionId: string } }>(
    "/api/v1/admin/sections/:sectionId/chapters",
    async (req) => {
      const { rows } = await query(
        `SELECT id, subject_id AS "sectionId", title, synopsis,
                image_url AS "imageUrl", sort_order AS "sortOrder",
                section_pdf_id AS "sectionPdfId"
         FROM chapters WHERE subject_id=$1 ORDER BY sort_order`,
        [req.params.sectionId],
      );
      return { items: rows };
    },
  );

  admin.patch<{ Params: { id: string } }>(
    "/api/v1/admin/chapters/:id",
    async (req) => {
      const body = z
        .object({
          title: z.string().min(1).max(200).optional(),
          synopsis: z.string().max(2000).optional(),
          sortOrder: z.number().int().optional(),
        })
        .parse(req.body);
      const { rows } = await query(
        `UPDATE chapters SET
           title = COALESCE($2, title),
           synopsis = COALESCE($3, synopsis),
           sort_order = COALESCE($4, sort_order)
         WHERE id=$1
         RETURNING id, subject_id AS "sectionId", title, synopsis,
                   image_url AS "imageUrl", sort_order AS "sortOrder"`,
        [
          req.params.id,
          body.title ?? null,
          body.synopsis ?? null,
          body.sortOrder ?? null,
        ],
      );
      if (!rows[0]) throw new AppError(404, "NOT_FOUND", "Chapter not found");
      return rows[0];
    },
  );

  admin.delete<{ Params: { id: string } }>(
    "/api/v1/admin/chapters/:id",
    async (req) => {
      const r = await query(`DELETE FROM chapters WHERE id=$1`, [req.params.id]);
      if (!r.rowCount) throw new AppError(404, "NOT_FOUND", "Chapter not found");
      return { ok: true };
    },
  );
  });
}
