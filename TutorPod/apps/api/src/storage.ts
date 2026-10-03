import {
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { isS3Configured, s3GetObject, s3PutObject } from "./storage/s3.js";

const root = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "storage",
);

export type StorageKind = "pdfs" | "audio";

export function ensureStorage() {
  for (const sub of ["pdfs", "audio"] as StorageKind[]) {
    const p = path.join(root, sub);
    if (!existsSync(p)) mkdirSync(p, { recursive: true });
  }
  return root;
}

export function pdfPath(filename: string) {
  return path.join(ensureStorage(), "pdfs", filename);
}

export function audioPath(filename: string) {
  return path.join(ensureStorage(), "audio", filename);
}

function objectKey(kind: StorageKind, filename: string) {
  return `${kind}/${filename}`;
}

function contentTypeFor(kind: StorageKind, filename: string) {
  if (kind === "pdfs" || filename.endsWith(".pdf")) return "application/pdf";
  if (filename.endsWith(".mp3")) return "audio/mpeg";
  return "application/octet-stream";
}

/** Best-effort mirror to S3 when configured. Local disk remains source of truth for streaming. */
export async function mirrorToRemote(
  kind: StorageKind,
  filename: string,
): Promise<"local" | "s3"> {
  if (!isS3Configured()) return "local";
  const abs =
    kind === "pdfs" ? pdfPath(filename) : audioPath(filename);
  if (!existsSync(abs)) return "local";
  const body = readFileSync(abs);
  await s3PutObject(objectKey(kind, filename), body, contentTypeFor(kind, filename));
  return "s3";
}

/**
 * Ensure object exists locally; if missing and S3 configured, download then return path.
 */
export async function resolveLocalFile(
  kind: StorageKind,
  filename: string,
): Promise<string> {
  const abs = kind === "pdfs" ? pdfPath(filename) : audioPath(filename);
  if (existsSync(abs)) return abs;
  if (!isS3Configured()) {
    throw new Error(`Missing local ${kind}/${filename} and S3 not configured`);
  }
  const buf = await s3GetObject(objectKey(kind, filename));
  ensureStorage();
  writeFileSync(abs, buf);
  return abs;
}

export async function writeLocalAndMaybeRemote(
  kind: StorageKind,
  filename: string,
  body: Buffer,
): Promise<string> {
  ensureStorage();
  const abs = kind === "pdfs" ? pdfPath(filename) : audioPath(filename);
  writeFileSync(abs, body);
  try {
    await mirrorToRemote(kind, filename);
  } catch (e) {
    console.warn(
      "[storage] S3 mirror failed; kept local:",
      e instanceof Error ? e.message : e,
    );
  }
  return abs;
}

/** Cache remote sample into local audio store for streaming. */
export async function ensureCachedAudio(
  key: string,
  sourceUrl = config.sampleAudioUrl,
): Promise<string> {
  const dest = audioPath(`${key}.mp3`);
  if (existsSync(dest)) return dest;
  ensureStorage();
  try {
    if (isS3Configured()) {
      try {
        return await resolveLocalFile("audio", `${key}.mp3`);
      } catch {
        /* fall through to download */
      }
    }
    const res = await fetch(sourceUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch audio source: ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeLocalAndMaybeRemote("audio", `${key}.mp3`, buf);
    return dest;
  } catch (err) {
    const dir = path.join(ensureStorage(), "audio");
    const existing = readdirSync(dir).find((f) => f.endsWith(".mp3"));
    if (existing) {
      copyFileSync(path.join(dir, existing), dest);
      return dest;
    }
    throw err;
  }
}

export { createWriteStream, isS3Configured };
