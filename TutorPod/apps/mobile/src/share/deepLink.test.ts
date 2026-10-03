import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  chapterDeepLink,
  chapterShareMessage,
  podDeepLink,
  podShareMessage,
} from "./deepLink";

describe("T071 share deep links", () => {
  it("builds tutorpod:// pod and chapter URLs", () => {
    assert.equal(podDeepLink("abc"), "tutorpod://pod/abc");
    assert.equal(chapterDeepLink("ch1"), "tutorpod://chapter/ch1");
  });

  it("includes title and links in share message", () => {
    const msg = podShareMessage("Atoms", "p1", "https://tutorpod.app");
    assert.match(msg, /Atoms/);
    assert.match(msg, /https:\/\/tutorpod\.app\/pod\/p1/);
    assert.match(msg, /tutorpod:\/\/pod\/p1/);
    assert.match(chapterShareMessage("Bonding", "c1"), /Bonding/);
  });
});
