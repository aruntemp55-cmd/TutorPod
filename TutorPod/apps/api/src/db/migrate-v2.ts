import { pool } from "./pool.js";

const sql = `
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student';

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN ('student','admin'));

CREATE TABLE IF NOT EXISTS section_pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  byte_size INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chapters
  ADD COLUMN IF NOT EXISTS section_pdf_id UUID REFERENCES section_pdfs(id) ON DELETE SET NULL;

ALTER TABLE pods
  ADD COLUMN IF NOT EXISTS standard_id UUID REFERENCES standards(id),
  ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES subjects(id),
  ADD COLUMN IF NOT EXISTS audio_storage_path TEXT;
`;

async function main() {
  await pool.query(sql);
  console.log("Migration v2 applied (role, section_pdfs, pod stream fields).");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
