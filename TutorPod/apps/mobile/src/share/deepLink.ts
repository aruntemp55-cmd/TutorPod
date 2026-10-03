/** T071 — deep link / share URL builders (no network). */

const APP_SCHEME = "tutorpod";

export function podDeepLink(podId: string) {
  return `${APP_SCHEME}://pod/${podId}`;
}

export function chapterDeepLink(chapterId: string) {
  return `${APP_SCHEME}://chapter/${chapterId}`;
}

export function podShareMessage(title: string, podId: string, webBase?: string) {
  const deep = podDeepLink(podId);
  const web = webBase
    ? `${webBase.replace(/\/$/, "")}/pod/${podId}`
    : deep;
  return `Listen on Tutor Pod: ${title}\n${web}\n${deep}`;
}

export function chapterShareMessage(
  title: string,
  chapterId: string,
  webBase?: string,
) {
  const deep = chapterDeepLink(chapterId);
  const web = webBase
    ? `${webBase.replace(/\/$/, "")}/chapter/${chapterId}`
    : deep;
  return `Tutor Pod chapter: ${title}\n${web}\n${deep}`;
}
