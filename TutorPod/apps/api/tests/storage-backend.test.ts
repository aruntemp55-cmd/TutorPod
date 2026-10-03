import assert from "node:assert/strict";
import { existsSync, unlinkSync } from "node:fs";
import { after, describe, it } from "node:test";
import {
  ensureStorage,
  isS3Configured,
  writeLocalAndMaybeRemote,
  audioPath,
} from "../src/storage.js";
import { readS3Config } from "../src/storage/s3.js";

describe("T077 storage backend", () => {
  const key = `test-${Date.now()}.mp3`;

  after(() => {
    const p = audioPath(key);
    if (existsSync(p)) unlinkSync(p);
  });

  it("isS3Configured false without env", () => {
    const prev = {
      b: process.env.S3_BUCKET,
      a: process.env.S3_ACCESS_KEY_ID,
      s: process.env.S3_SECRET_ACCESS_KEY,
    };
    delete process.env.S3_BUCKET;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
    assert.equal(isS3Configured(), false);
    assert.equal(readS3Config(), null);
    if (prev.b) process.env.S3_BUCKET = prev.b;
    if (prev.a) process.env.S3_ACCESS_KEY_ID = prev.a;
    if (prev.s) process.env.S3_SECRET_ACCESS_KEY = prev.s;
  });

  it("writes local when S3 unset", async () => {
    ensureStorage();
    const abs = await writeLocalAndMaybeRemote(
      "audio",
      key,
      Buffer.from("ID3fake"),
    );
    assert.ok(existsSync(abs));
    assert.equal(abs, audioPath(key));
  });
});
