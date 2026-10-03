import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { searchHitDestination } from "./searchHits";

describe("searchHitDestination", () => {
  const chapter = {
    id: "ch1",
    sectionId: "sec1",
    standardId: "std1",
    title: "Equilibrium",
    imageUrl: "",
    sortOrder: 1,
    sourceCount: 1,
  };

  it("sends topic hits to Start podcast", () => {
    const dest = searchHitDestination(
      { kind: "topic", id: chapter.id, title: chapter.title, chapter },
      "fallback",
    );
    assert.deepEqual(dest, {
      name: "StartPodcast",
      params: {
        standardId: "std1",
        sectionId: "sec1",
        chapterId: "ch1",
        chapterTitle: "Equilibrium",
      },
    });
  });

  it("uses profile standard when chapter omits standardId", () => {
    const dest = searchHitDestination(
      {
        kind: "topic",
        id: "ch1",
        title: "Equilibrium",
        chapter: { ...chapter, standardId: undefined },
      },
      "from-profile",
    );
    assert.equal(dest?.name, "StartPodcast");
    if (dest?.name === "StartPodcast") {
      assert.equal(dest.params.standardId, "from-profile");
    }
  });

  it("sends subject hits to topic list", () => {
    const dest = searchHitDestination(
      {
        kind: "subject",
        id: "sec1",
        title: "Chemistry",
        section: {
          id: "sec1",
          standardId: "std1",
          name: "Chemistry",
          slug: "chemistry",
        },
      },
      null,
    );
    assert.deepEqual(dest, {
      name: "SubjectTopics",
      params: {
        standardId: "std1",
        sectionId: "sec1",
        sectionName: "Chemistry",
      },
    });
  });

  it("sends pod hits to Player", () => {
    const dest = searchHitDestination(
      { kind: "pod", id: "p1", title: "Pod" },
      null,
    );
    assert.deepEqual(dest, { name: "Player", params: { podId: "p1" } });
  });
});
