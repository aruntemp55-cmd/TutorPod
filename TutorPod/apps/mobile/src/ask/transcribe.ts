import { apiUpload } from "../api/client";
import { guessAudioMeta } from "./audioMeta";

/** Upload recorded audio to Whisper (or STT stub path) and return transcript text. */
export async function transcribeRecording(
  token: string,
  uri: string,
): Promise<string> {
  const meta = guessAudioMeta(uri);
  const form = new FormData();
  form.append("file", {
    uri,
    name: meta.name,
    type: meta.type,
  } as unknown as Blob);
  const res = await apiUpload<{ transcript: string }>(
    "/api/v1/ask/transcribe",
    { token, form },
  );
  return res.transcript.trim();
}
