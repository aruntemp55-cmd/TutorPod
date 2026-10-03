import type { User } from "../api/types";

/** R025 — student must have name + standard before Main. */
export function isProfileComplete(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.profileComplete === true) return true;
  if (user.profileComplete === false) return false;
  const name = (user.name ?? "").trim();
  return name.length > 0 && !!user.standardId;
}

/** Post-auth destination for students. */
export function studentHomeRoute(user: User): "Settings" | "Main" {
  return isProfileComplete(user) ? "Main" : "Settings";
}
