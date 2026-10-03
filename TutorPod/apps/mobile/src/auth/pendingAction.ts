export type PendingAction =
  | {
      type: "startPodcast";
      standardId: string;
      sectionId: string;
      chapterId: string;
      chapterTitle: string;
    }
  | { type: "playPod"; podId: string }
  | { type: "openLearningPath" }
  | { type: "openMyPods" };

let pending: PendingAction | null = null;

export function setPendingAction(action: PendingAction | null) {
  pending = action;
}

export function takePendingAction(): PendingAction | null {
  const a = pending;
  pending = null;
  return a;
}

export function peekPendingAction() {
  return pending;
}
