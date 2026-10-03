export type Standard = { id: string; code: string; name: string; board: string };
/** Section (API); DB historically named subjects. */
export type Section = { id: string; standardId: string; name: string; slug: string };
export type Chapter = {
  id: string;
  sectionId?: string;
  subjectId?: string;
  title: string;
  synopsis?: string | null;
  imageUrl: string;
  sortOrder: number;
  sourceCount: number;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role?: "student" | "admin";
  standardId: string | null;
  standard?: { id: string; name: string; code: string } | null;
  /** Server-computed; Name + Standard required for students */
  profileComplete?: boolean;
};

export type Pod = {
  id: string;
  chapterId: string;
  title: string;
  hostCount: number;
  contextText?: string | null;
  status: "queued" | "generating" | "ready" | "failed";
  audioUrl?: string | null;
  durationSec?: number | null;
  errorMessage?: string | null;
  createdAt: string;
  positionSec?: number;
  reaction?: "like" | "dislike" | null;
  chapterTitle?: string;
};

export type LearningPath = {
  id: string;
  sectionId?: string;
  subjectId?: string;
  name: string;
  description?: string | null;
};

export type Question = {
  id: string;
  podId: string;
  questionText: string;
  answerText?: string | null;
  status: string;
};
