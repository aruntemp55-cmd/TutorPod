const TYPE_INSTEAD = "Type your question instead.";

function errorCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return err instanceof Error ? err.message : "";
}

/** Friendly voice errors — never show raw "Failed to fetch" for STT. */
export function userFacingVoiceError(err: unknown): string {
  const code = errorCode(err);
  const raw = errorMessage(err);
  if (code === "STT_UNAVAILABLE") {
    return `Voice needs an API key. ${TYPE_INSTEAD}`;
  }
  if (code === "STT_FAILED") {
    return raw.includes("Type")
      ? raw
      : `Could not transcribe audio. ${TYPE_INSTEAD}`;
  }
  if (
    !raw ||
    /failed to fetch|network request failed|load failed|networkerror/i.test(raw)
  ) {
    return `Can't reach the tutor just now. Voice needs an API key on the server — ${TYPE_INSTEAD.toLowerCase()}`;
  }
  return raw;
}
