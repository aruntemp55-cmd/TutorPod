/**
 * T024 — gate Play/Start/Learning Path: guest runs soft-prompt path; never opens Player.
 */
export function requireAuthForAction(
  isAuthenticated: boolean,
  onGuest: () => void,
  onAuthed: () => void,
): boolean {
  if (!isAuthenticated) {
    onGuest();
    return false;
  }
  onAuthed();
  return true;
}
