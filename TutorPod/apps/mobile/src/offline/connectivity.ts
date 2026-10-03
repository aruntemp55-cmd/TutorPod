/** T044 — lightweight offline flag (no native NetInfo dependency). */
type Listener = (offline: boolean) => void;

let offline = false;
const listeners = new Set<Listener>();

export function isOffline() {
  return offline;
}

export function setOffline(value: boolean) {
  if (offline === value) return;
  offline = value;
  for (const l of listeners) l(offline);
}

export function subscribeOffline(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Call when fetch fails with a network-looking error. */
export function noteNetworkFailure(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  if (/network|failed to fetch|offline|ECONNREFUSED|ENOTFOUND/i.test(msg)) {
    setOffline(true);
  }
}

export function noteNetworkSuccess() {
  setOffline(false);
}
