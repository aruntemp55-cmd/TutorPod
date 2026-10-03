import type { Chapter, Section } from "../api/types";
import type { RootStackParamList } from "./types";

export type SearchNavHit =
  | {
      kind: "topic";
      id: string;
      title: string;
      chapter: Chapter;
    }
  | {
      kind: "subject";
      id: string;
      title: string;
      section: Section;
    }
  | { kind: "pod"; id: string; title: string };

type Dest =
  | { name: "StartPodcast"; params: RootStackParamList["StartPodcast"] }
  | { name: "SubjectTopics"; params: RootStackParamList["SubjectTopics"] }
  | { name: "Player"; params: RootStackParamList["Player"] };

/** Map GET /api/v1/search hits to live v3 routes. */
export function searchHitDestination(
  hit: SearchNavHit,
  fallbackStandardId: string | null,
): Dest | null {
  if (hit.kind === "pod") {
    return { name: "Player", params: { podId: hit.id } };
  }
  if (hit.kind === "subject") {
    const standardId = hit.section.standardId || fallbackStandardId;
    if (!standardId) return null;
    return {
      name: "SubjectTopics",
      params: {
        standardId,
        sectionId: hit.section.id,
        sectionName: hit.section.name,
      },
    };
  }
  const sectionId = hit.chapter.sectionId ?? hit.chapter.subjectId;
  const standardId = hit.chapter.standardId ?? fallbackStandardId;
  if (!sectionId || !standardId) return null;
  return {
    name: "StartPodcast",
    params: {
      standardId,
      sectionId,
      chapterId: hit.chapter.id,
      chapterTitle: hit.chapter.title,
    },
  };
}
