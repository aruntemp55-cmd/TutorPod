import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { buildApp } from "../src/app.js";
import { config } from "../src/config.js";
import { pool } from "../src/db/pool.js";
import { waitForPodFinalizers } from "../src/routes/pods.js";
import { ensureCachedAudio } from "../src/storage.js";
import {
  resetAnswerQuestionImpl,
  setAnswerQuestionImpl,
} from "../src/services/qa.js";
import {
  resetTranscribeImpl,
  setTranscribeImpl,
} from "../src/services/stt.js";

process.env.POD_GENERATE_DELAY_MS = "0";
// Integration suite uses stub AI (no live OpenAI spend/latency)
process.env.OPENAI_API_KEY = "";

describe("Tutor Pod API v2", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  before(async () => {
    // Warm sample MP3 cache so generating→ready is not network-bound in CI
    await ensureCachedAudio("warmup", config.sampleAudioUrl);
    await ensureCachedAudio("sample-fallback", config.sampleAudioUrl);
    app = await buildApp();
  });

  after(async () => {
    await waitForPodFinalizers();
    await app.close();
    await pool.end();
  });

  async function login(email: string) {
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/otp/request",
      payload: { email },
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/otp/verify",
      payload: { email, code: config.otpStubCode },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json();
    return { token: body.accessToken as string, user: body.user };
  }

  it("guest browses standards → sections → chapters", async () => {
    const standards = await app.inject({
      method: "GET",
      url: "/api/v1/catalog/standards",
    });
    assert.equal(standards.statusCode, 200);
    const std = standards.json().items[0];
    const sections = await app.inject({
      method: "GET",
      url: `/api/v1/catalog/standards/${std.id}/sections`,
    });
    assert.equal(sections.statusCode, 200);
    const section = sections.json().items[0];
    const chapters = await app.inject({
      method: "GET",
      url: `/api/v1/catalog/sections/${section.id}/chapters`,
    });
    assert.equal(chapters.statusCode, 200);
    assert.ok(chapters.json().items[0]?.title);
    assert.equal("audioUrl" in chapters.json().items[0], false);
  });

  it("401 without auth for pods and admin", async () => {
    assert.equal(
      (await app.inject({ method: "GET", url: "/api/v1/pods" })).statusCode,
      401,
    );
    assert.equal(
      (
        await app.inject({ method: "GET", url: "/api/v1/admin/standards" })
      ).statusCode,
      401,
    );
  });

  async function waitPodReady(token: string, podId: string) {
    for (let i = 0; i < 200; i++) {
      const st = await app.inject({
        method: "GET",
        url: `/api/v1/pods/${podId}/status`,
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(st.statusCode, 200, st.body);
      const body = st.json();
      if (body.status === "ready") return body;
      if (body.status === "failed") {
        throw new Error(`pod failed: ${body.errorMessage}`);
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error("pod did not become ready in time");
  }

  it("student starts podcast with hierarchy + streams audio", async () => {
    const { token } = await login(`student-${Date.now()}@example.com`);
    const std = (
      await app.inject({ method: "GET", url: "/api/v1/catalog/standards" })
    )
      .json()
      .items.find((s: { code: string }) => s.code === "CBSE-12");
    const section = (
      await app.inject({
        method: "GET",
        url: `/api/v1/catalog/standards/${std.id}/sections`,
      })
    ).json().items[0];
    const chapter = (
      await app.inject({
        method: "GET",
        url: `/api/v1/catalog/sections/${section.id}/chapters`,
      })
    ).json().items[0];

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/pods",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        standardId: std.id,
        sectionId: section.id,
        chapterId: chapter.id,
        hostCount: 2,
        contextText: "mechanisms",
      },
    });
    assert.equal(created.statusCode, 200, created.body);
    const pod = created.json();
    assert.equal(pod.status, "generating");
    assert.equal(pod.audioUrl, null);

    const ready = await waitPodReady(token, pod.id);
    assert.ok(String(ready.audioUrl).includes("/audio"));

    const stream = await app.inject({
      method: "GET",
      url: `/api/v1/pods/${pod.id}/audio`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(stream.statusCode, 200);
    assert.ok(stream.headers["content-type"]?.includes("audio"));
    assert.ok((stream.rawPayload?.length ?? 0) > 1000);
  });

  it("admin can CRUD section and generate stub chapters", async () => {
    const { token, user } = await login("admin@tutorpod.local");
    assert.equal(user.role, "admin");

    const standards = await app.inject({
      method: "GET",
      url: "/api/v1/admin/standards",
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(standards.statusCode, 200);
    const stdId = standards.json().items[0].id;

    const section = await app.inject({
      method: "POST",
      url: `/api/v1/admin/standards/${stdId}/sections`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: `Test Section ${Date.now()}` },
    });
    assert.equal(section.statusCode, 200, section.body);
    const sectionId = section.json().id;

    // Tiny fake PDF bytes
    const boundary = "----tpboundary";
    const pdfBody = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="unit.pdf"\r\nContent-Type: application/pdf\r\n\r\n`,
      ),
      Buffer.from("%PDF-1.4 stub"),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const upload = await app.inject({
      method: "POST",
      url: `/api/v1/admin/sections/${sectionId}/pdf`,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: pdfBody,
    });
    assert.equal(upload.statusCode, 200, upload.body);
    const pdfId = upload.json().id;

    const gen = await app.inject({
      method: "POST",
      url: `/api/v1/admin/sections/${sectionId}/generate-chapters`,
      headers: { authorization: `Bearer ${token}` },
      payload: { pdfId },
    });
    assert.equal(gen.statusCode, 200, gen.body);
    assert.ok(gen.json().items.length >= 1);
    assert.equal(gen.json().stub, true);

    const chapterId = gen.json().items[0].id;
    const patched = await app.inject({
      method: "PATCH",
      url: `/api/v1/admin/chapters/${chapterId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { title: "Edited Chapter Title" },
    });
    assert.equal(patched.statusCode, 200);
    assert.equal(patched.json().title, "Edited Chapter Title");
  });

  it("student forbidden from admin", async () => {
    const { token } = await login(`noadmin-${Date.now()}@example.com`);
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/standards",
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
  });


  it("Sprint2 T020 seed has CBSE Chemistry standards/sections/chapters with images", async () => {
    const standards = await app.inject({
      method: "GET",
      url: "/api/v1/catalog/standards",
    });
    assert.equal(standards.statusCode, 200);
    const items = standards.json().items as { id: string; code: string }[];
    const codes = items.map((s) => s.code).sort();
    assert.deepEqual(codes, ["CBSE-11", "CBSE-12"]);

    for (const std of items) {
      const sections = await app.inject({
        method: "GET",
        url: `/api/v1/catalog/standards/${std.id}/sections`,
      });
      assert.equal(sections.statusCode, 200);
      const secItems = sections.json().items as { id: string; name: string }[];
      assert.ok(secItems.some((s) => s.name === "Chemistry"));
      const chem = secItems.find((s) => s.name === "Chemistry")!;
      const chapters = await app.inject({
        method: "GET",
        url: `/api/v1/catalog/sections/${chem.id}/chapters`,
      });
      assert.equal(chapters.statusCode, 200);
      const ch = chapters.json().items as {
        title: string;
        imageUrl: string;
      }[];
      assert.ok(ch.length >= 4, `${std.code} should have chapters`);
      for (const c of ch) {
        assert.ok(c.imageUrl, `chapter ${c.title} missing imageUrl`);
        assert.equal("audioUrl" in c, false);
      }
    }
  });

  it("Sprint2 T021 subjects alias + T075 guest LP teaser", async () => {
    const std = (
      await app.inject({ method: "GET", url: "/api/v1/catalog/standards" })
    ).json().items[0];
    const viaSubjects = await app.inject({
      method: "GET",
      url: `/api/v1/catalog/standards/${std.id}/subjects`,
    });
    assert.equal(viaSubjects.statusCode, 200);
    assert.ok(viaSubjects.json().items.length >= 1);
    const sectionId = viaSubjects.json().items[0].id;

    // T075 — guests see path names/teaser (select still auth-gated)
    const guestPaths = await app.inject({
      method: "GET",
      url: `/api/v1/catalog/sections/${sectionId}/learning-paths`,
    });
    assert.equal(guestPaths.statusCode, 200);
    assert.equal(guestPaths.json().teaser, true);
    assert.ok(guestPaths.json().items[0]?.name);

    const guestChapters = await app.inject({
      method: "GET",
      url: `/api/v1/catalog/subjects/${sectionId}/chapters`,
    });
    assert.equal(guestChapters.statusCode, 200);
    assert.equal("audioUrl" in guestChapters.json().items[0], false);
  });


  it("Sprint3 T031 rejects invalid hostCount", async () => {
    const { token } = await login(`hosts-${Date.now()}@example.com`);
    const std = (
      await app.inject({ method: "GET", url: "/api/v1/catalog/standards" })
    ).json().items[0];
    const section = (
      await app.inject({
        method: "GET",
        url: `/api/v1/catalog/standards/${std.id}/sections`,
      })
    ).json().items[0];
    const chapter = (
      await app.inject({
        method: "GET",
        url: `/api/v1/catalog/sections/${section.id}/chapters`,
      })
    ).json().items[0];
    const bad = await app.inject({
      method: "POST",
      url: "/api/v1/pods",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        standardId: std.id,
        sectionId: section.id,
        chapterId: chapter.id,
        hostCount: 1,
      },
    });
    assert.equal(bad.statusCode, 400);
  });

  it("Sprint3 T035 progress + reaction persist", async () => {
    const { token } = await login(`progress-${Date.now()}@example.com`);
    const headers = { authorization: `Bearer ${token}` };
    const std = (
      await app.inject({ method: "GET", url: "/api/v1/catalog/standards" })
    )
      .json()
      .items.find((s: { code: string }) => s.code === "CBSE-11");
    const section = (
      await app.inject({
        method: "GET",
        url: `/api/v1/catalog/standards/${std.id}/sections`,
      })
    ).json().items[0];
    const chapter = (
      await app.inject({
        method: "GET",
        url: `/api/v1/catalog/sections/${section.id}/chapters`,
      })
    ).json().items[0];
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/pods",
      headers,
      payload: {
        standardId: std.id,
        sectionId: section.id,
        chapterId: chapter.id,
        hostCount: 2,
      },
    });
    const podId = created.json().id as string;
    await waitPodReady(token, podId);

    const prog = await app.inject({
      method: "PUT",
      url: `/api/v1/pods/${podId}/progress`,
      headers,
      payload: { positionSec: 42.5 },
    });
    assert.equal(prog.statusCode, 200);
    assert.equal(prog.json().positionSec, 42.5);

    const like = await app.inject({
      method: "PUT",
      url: `/api/v1/pods/${podId}/reaction`,
      headers,
      payload: { value: "like" },
    });
    assert.equal(like.statusCode, 200);
    assert.equal(like.json().value, "like");

    const got = await app.inject({
      method: "GET",
      url: `/api/v1/pods/${podId}`,
      headers,
    });
    assert.equal(got.statusCode, 200);
    assert.equal(got.json().positionSec, 42.5);
    assert.equal(got.json().reaction, "like");

    const list = await app.inject({
      method: "GET",
      url: "/api/v1/pods",
      headers,
    });
    assert.equal(list.statusCode, 200);
    const row = list.json().items.find((p: { id: string }) => p.id === podId);
    assert.ok(row);
    assert.equal(row.positionSec, 42.5);
    assert.equal(row.reaction, "like");
  });

  it("Sprint3 T036 guest 401 on pods/audio/progress/reaction", async () => {
    assert.equal(
      (await app.inject({ method: "GET", url: "/api/v1/pods" })).statusCode,
      401,
    );
    assert.equal(
      (
        await app.inject({
          method: "GET",
          url: "/api/v1/pods/00000000-0000-0000-0000-000000000001/audio",
        })
      ).statusCode,
      401,
    );
    assert.equal(
      (
        await app.inject({
          method: "PUT",
          url: "/api/v1/pods/00000000-0000-0000-0000-000000000001/progress",
          payload: { positionSec: 1 },
        })
      ).statusCode,
      401,
    );
    assert.equal(
      (
        await app.inject({
          method: "PUT",
          url: "/api/v1/pods/00000000-0000-0000-0000-000000000001/reaction",
          payload: { value: "like" },
        })
      ).statusCode,
      401,
    );
  });


  it("Sprint4 T040 questions API stub answer + graceful LLM fail", async () => {
    const { token } = await login(`qa-${Date.now()}@example.com`);
    const headers = { authorization: `Bearer ${token}` };
    const std = (
      await app.inject({ method: "GET", url: "/api/v1/catalog/standards" })
    )
      .json()
      .items.find((s: { code: string }) => s.code === "CBSE-12");
    const section = (
      await app.inject({
        method: "GET",
        url: `/api/v1/catalog/standards/${std.id}/sections`,
      })
    ).json().items[0];
    const chapter = (
      await app.inject({
        method: "GET",
        url: `/api/v1/catalog/sections/${section.id}/chapters`,
      })
    ).json().items[0];
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/pods",
      headers,
      payload: {
        standardId: std.id,
        sectionId: section.id,
        chapterId: chapter.id,
        hostCount: 2,
        contextText: "mechanisms",
      },
    });
    const podId = created.json().id as string;
    await waitPodReady(token, podId);

    const asked = await app.inject({
      method: "POST",
      url: `/api/v1/pods/${podId}/questions`,
      headers,
      payload: { questionText: "What is nucleophilic addition?" },
    });
    assert.equal(asked.statusCode, 200, asked.body);
    assert.equal(asked.json().status, "answered");
    assert.match(String(asked.json().answerText), /Great question|Focus on/i);

    const list = await app.inject({
      method: "GET",
      url: `/api/v1/pods/${podId}/questions`,
      headers,
    });
    assert.equal(list.statusCode, 200);
    assert.ok(list.json().items.length >= 1);

    setAnswerQuestionImpl(async () => {
      throw new Error("AI unavailable");
    });
    try {
      const failed = await app.inject({
        method: "POST",
        url: `/api/v1/pods/${podId}/questions`,
        headers,
        payload: { questionText: "Will this fail gracefully?" },
      });
      assert.equal(failed.statusCode, 200, failed.body);
      assert.equal(failed.json().status, "failed");
      assert.match(String(failed.json().answerText), /unavailable|try again/i);
    } finally {
      resetAnswerQuestionImpl();
    }
  });

  it("Sprint4 T042 learning path list + select (auth)", async () => {
    const { token } = await login(`paths-${Date.now()}@example.com`);
    const headers = { authorization: `Bearer ${token}` };
    const std = (
      await app.inject({ method: "GET", url: "/api/v1/catalog/standards" })
    )
      .json()
      .items.find((s: { code: string }) => s.code === "CBSE-12");
    const section = (
      await app.inject({
        method: "GET",
        url: `/api/v1/catalog/standards/${std.id}/sections`,
      })
    ).json().items[0];

    const paths = await app.inject({
      method: "GET",
      url: `/api/v1/catalog/sections/${section.id}/learning-paths`,
      headers,
    });
    assert.equal(paths.statusCode, 200);
    assert.ok(paths.json().items.length >= 1);
    const pathId = paths.json().items[0].id as string;

    const selected = await app.inject({
      method: "PUT",
      url: `/api/v1/me/learning-paths/${section.id}`,
      headers,
      payload: { learningPathId: pathId },
    });
    assert.equal(selected.statusCode, 200, selected.body);
    assert.equal(selected.json().learningPathId, pathId);

    const mine = await app.inject({
      method: "GET",
      url: "/api/v1/me/learning-paths",
      headers,
    });
    assert.equal(mine.statusCode, 200);
    assert.ok(
      mine.json().items.some(
        (x: { learningPathId: string }) => x.learningPathId === pathId,
      ),
    );

    const guestSelect = await app.inject({
      method: "PUT",
      url: `/api/v1/me/learning-paths/${section.id}`,
      payload: { learningPathId: pathId },
    });
    assert.equal(guestSelect.statusCode, 401);
  });

  it("Sprint1 T010 request → verify → refresh → logout", async () => {
    const email = `sprint1-${Date.now()}@example.com`;
    const req = await app.inject({
      method: "POST",
      url: "/api/v1/auth/otp/request",
      payload: { email },
    });
    assert.equal(req.statusCode, 200);

    const bad = await app.inject({
      method: "POST",
      url: "/api/v1/auth/otp/verify",
      payload: { email, code: "999999" },
    });
    assert.equal(bad.statusCode, 401);

    const verify = await app.inject({
      method: "POST",
      url: "/api/v1/auth/otp/verify",
      payload: { email, code: config.otpStubCode },
    });
    assert.equal(verify.statusCode, 200, verify.body);
    const session = verify.json();
    assert.ok(session.accessToken);
    assert.ok(session.refreshToken);

    const refreshed = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: { refreshToken: session.refreshToken },
    });
    assert.equal(refreshed.statusCode, 200);
    const next = refreshed.json();
    assert.ok(next.accessToken);
    assert.notEqual(next.refreshToken, session.refreshToken);

    const reuse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: { refreshToken: session.refreshToken },
    });
    assert.equal(reuse.statusCode, 401);

    const logout = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: { authorization: `Bearer ${next.accessToken}` },
      payload: { refreshToken: next.refreshToken },
    });
    assert.equal(logout.statusCode, 200);

    const afterLogout = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: { refreshToken: next.refreshToken },
    });
    assert.equal(afterLogout.statusCode, 401);
  });

  it("Sprint1 T013 GET/PATCH /me name and standardId", async () => {
    const email = `profile-${Date.now()}@example.com`;
    const { token } = await login(email);
    const headers = { authorization: `Bearer ${token}` };

    assert.equal(
      (await app.inject({ method: "GET", url: "/api/v1/me" })).statusCode,
      401,
    );

    const me = await app.inject({ method: "GET", url: "/api/v1/me", headers });
    assert.equal(me.statusCode, 200);
    assert.equal(me.json().email, email.toLowerCase());

    const standards = await app.inject({
      method: "GET",
      url: "/api/v1/catalog/standards",
    });
    const stdId = standards.json().items.find(
      (s: { code: string }) => s.code === "CBSE-11",
    )?.id;
    assert.ok(stdId);

    const patched = await app.inject({
      method: "PATCH",
      url: "/api/v1/me",
      headers,
      payload: { name: "Priya Student", standardId: stdId },
    });
    assert.equal(patched.statusCode, 200);
    assert.equal(patched.json().name, "Priya Student");
    assert.equal(patched.json().standardId, stdId);
    assert.equal(patched.json().role, "student");

    const me2 = await app.inject({ method: "GET", url: "/api/v1/me", headers });
    assert.equal(me2.json().name, "Priya Student");
    assert.equal(me2.json().standardId, stdId);
  });

  it("P1 T070 search standards/sections/chapters", async () => {
    const empty = await app.inject({
      method: "GET",
      url: "/api/v1/search?q=",
    });
    assert.equal(empty.statusCode, 200);
    assert.equal(empty.json().chapters.length, 0);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/search?q=chem",
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json();
    assert.ok(
      body.sections.length + body.chapters.length + body.standards.length > 0,
      "expected catalog hits for chem",
    );
    assert.equal(body.pods.length, 0);
  });

  it("P1 T071 share link for owned pod", async () => {
    const { token } = await login(`share-${Date.now()}@example.com`);
    const headers = { authorization: `Bearer ${token}` };
    const std = (
      await app.inject({ method: "GET", url: "/api/v1/catalog/standards" })
    )
      .json()
      .items.find((s: { code: string }) => s.code === "CBSE-12");
    const section = (
      await app.inject({
        method: "GET",
        url: `/api/v1/catalog/standards/${std.id}/sections`,
      })
    ).json().items[0];
    const chapter = (
      await app.inject({
        method: "GET",
        url: `/api/v1/catalog/sections/${section.id}/chapters`,
      })
    ).json().items[0];
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/pods",
      headers,
      payload: {
        standardId: std.id,
        sectionId: section.id,
        chapterId: chapter.id,
        hostCount: 2,
      },
    });
    assert.equal(created.statusCode, 200, created.body);
    const podId = created.json().id as string;
    await waitPodReady(token, podId);

    const share = await app.inject({
      method: "GET",
      url: `/api/v1/pods/${podId}/share`,
      headers,
    });
    assert.equal(share.statusCode, 200, share.body);
    assert.match(share.json().url, /\/pod\//);
    assert.match(share.json().deepLink, /^tutorpod:\/\/pod\//);
  });

  it("P2 T076 pod create returns 429 when quota exceeded", async () => {
    const { resetRateLimits } = await import("../src/rateLimit.js");
    resetRateLimits();
    process.env.RATE_LIMIT_MAX_PODS = "100";
    process.env.POD_DAILY_QUOTA = "1";
    const { token } = await login(`quota-${Date.now()}@example.com`);
    const headers = { authorization: `Bearer ${token}` };
    const std = (
      await app.inject({ method: "GET", url: "/api/v1/catalog/standards" })
    ).json().items[0];
    const section = (
      await app.inject({
        method: "GET",
        url: `/api/v1/catalog/standards/${std.id}/sections`,
      })
    ).json().items[0];
    const chapter = (
      await app.inject({
        method: "GET",
        url: `/api/v1/catalog/sections/${section.id}/chapters`,
      })
    ).json().items[0];
    const payload = {
      standardId: std.id,
      sectionId: section.id,
      chapterId: chapter.id,
      hostCount: 2,
    };
    const first = await app.inject({
      method: "POST",
      url: "/api/v1/pods",
      headers,
      payload,
    });
    assert.equal(first.statusCode, 200, first.body);
    const second = await app.inject({
      method: "POST",
      url: "/api/v1/pods",
      headers,
      payload,
    });
    assert.equal(second.statusCode, 429, second.body);
    assert.equal(second.json().error.code, "QUOTA_EXCEEDED");
    resetRateLimits();
    delete process.env.POD_DAILY_QUOTA;
    delete process.env.RATE_LIMIT_MAX_PODS;
  });

  it("R027 STT without key returns 503 STT_UNAVAILABLE", async () => {
    resetTranscribeImpl();
    const { token } = await login(`stt-nokey-${Date.now()}@example.com`);
    const boundary = "----sttboundary";
    const audioBody = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="q.m4a"\r\nContent-Type: audio/mp4\r\n\r\n`,
      ),
      Buffer.from("fake-audio"),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/ask/transcribe",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: audioBody,
    });
    assert.equal(res.statusCode, 503, res.body);
    assert.equal(res.json().error.code, "STT_UNAVAILABLE");
  });

  it("R027 STT mock returns transcript", async () => {
    setTranscribeImpl(async () => "What is a mole?");
    try {
      const { token } = await login(`stt-mock-${Date.now()}@example.com`);
      const boundary = "----sttmock";
      const audioBody = Buffer.concat([
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="q.m4a"\r\nContent-Type: audio/mp4\r\n\r\n`,
        ),
        Buffer.from("fake-audio"),
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/ask/transcribe",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": `multipart/form-data; boundary=${boundary}`,
        },
        payload: audioBody,
      });
      assert.equal(res.statusCode, 200, res.body);
      assert.equal(res.json().transcript, "What is a mole?");
      assert.equal(res.json().provider, "mock");
    } finally {
      resetTranscribeImpl();
    }
  });
});
