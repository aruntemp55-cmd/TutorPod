/** Infer multipart filename + MIME from a recorder URI. */
export function guessAudioMeta(uri: string): { name: string; type: string } {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".wav")) return { name: "question.wav", type: "audio/wav" };
  if (lower.endsWith(".webm"))
    return { name: "question.webm", type: "audio/webm" };
  if (lower.endsWith(".mp3")) return { name: "question.mp3", type: "audio/mpeg" };
  if (lower.endsWith(".caf")) return { name: "question.caf", type: "audio/x-caf" };
  if (lower.endsWith(".ogg")) return { name: "question.ogg", type: "audio/ogg" };
  return { name: "question.m4a", type: "audio/mp4" };
}
