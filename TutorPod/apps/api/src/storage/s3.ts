/**
 * Minimal S3-compatible Put/Get (AWS SigV4) — no AWS SDK required (T077).
 * Used only when S3_BUCKET + credentials are set.
 */

import { createHash, createHmac } from "node:crypto";

export type S3Config = {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  forcePathStyle: boolean;
};

export function readS3Config(): S3Config | null {
  const bucket = (process.env.S3_BUCKET ?? "").trim();
  const accessKeyId = (process.env.S3_ACCESS_KEY_ID ?? "").trim();
  const secretAccessKey = (process.env.S3_SECRET_ACCESS_KEY ?? "").trim();
  if (!bucket || !accessKeyId || !secretAccessKey) return null;
  return {
    bucket,
    region: (process.env.S3_REGION ?? "us-east-1").trim(),
    accessKeyId,
    secretAccessKey,
    endpoint: (process.env.S3_ENDPOINT ?? "").trim() || undefined,
    forcePathStyle:
      String(process.env.S3_FORCE_PATH_STYLE ?? "true").toLowerCase() !==
      "false",
  };
}

export function isS3Configured() {
  return readS3Config() !== null;
}

function hmac(key: Buffer | string, data: string) {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: Buffer | string) {
  return createHash("sha256").update(data).digest("hex");
}

function amzDate(d = new Date()) {
  const iso = d.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amz: iso.slice(0, 16) + "Z", date: iso.slice(0, 8) };
}

function hostAndPath(cfg: S3Config, key: string) {
  const encKey = key
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");
  if (cfg.endpoint) {
    const u = new URL(cfg.endpoint);
    const host = u.host;
    const basePath = u.pathname.replace(/\/$/, "");
    const path = cfg.forcePathStyle
      ? `${basePath}/${cfg.bucket}/${encKey}`
      : `${basePath}/${encKey}`;
    return { host, path: path.startsWith("/") ? path : `/${path}`, proto: u.protocol };
  }
  if (cfg.forcePathStyle) {
    return {
      host: `s3.${cfg.region}.amazonaws.com`,
      path: `/${cfg.bucket}/${encKey}`,
      proto: "https:",
    };
  }
  return {
    host: `${cfg.bucket}.s3.${cfg.region}.amazonaws.com`,
    path: `/${encKey}`,
    proto: "https:",
  };
}

async function signedFetch(
  cfg: S3Config,
  method: "PUT" | "GET",
  key: string,
  body?: Buffer,
  contentType?: string,
) {
  const { host, path, proto } = hostAndPath(cfg, key);
  const { amz, date } = amzDate();
  const payloadHash = sha256Hex(body ?? "");
  const headers: Record<string, string> = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amz,
  };
  if (contentType) headers["content-type"] = contentType;
  if (body) headers["content-length"] = String(body.length);

  const signedHeaderNames = Object.keys(headers)
    .map((h) => h.toLowerCase())
    .sort();
  const canonicalHeaders = signedHeaderNames
    .map((h) => `${h}:${headers[h]}\n`)
    .join("");
  const signedHeaders = signedHeaderNames.join(";");
  const canonicalRequest = [
    method,
    path,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${date}/${cfg.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amz,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = hmac(`AWS4${cfg.secretAccessKey}`, date);
  const kRegion = hmac(kDate, cfg.region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning)
    .update(stringToSign, "utf8")
    .digest("hex");

  headers.authorization = `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const url = `${proto}//${host}${path}`;
  const res = await fetch(url, { method, headers, body: body as BodyInit | undefined });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`S3 ${method} ${key} failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return res;
}

export async function s3PutObject(
  key: string,
  body: Buffer,
  contentType = "application/octet-stream",
) {
  const cfg = readS3Config();
  if (!cfg) throw new Error("S3 not configured");
  await signedFetch(cfg, "PUT", key, body, contentType);
}

export async function s3GetObject(key: string): Promise<Buffer> {
  const cfg = readS3Config();
  if (!cfg) throw new Error("S3 not configured");
  const res = await signedFetch(cfg, "GET", key);
  return Buffer.from(await res.arrayBuffer());
}
