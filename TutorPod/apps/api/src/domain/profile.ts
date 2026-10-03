/** Student profile completeness (R025). */

export function isProfileComplete(user: {
  name?: string | null;
  standardId?: string | null;
  standard_id?: string | null;
  role?: string;
}): boolean {
  if (user.role === "admin") return true;
  const name = (user.name ?? "").trim();
  const standardId = user.standardId ?? user.standard_id ?? null;
  return name.length > 0 && !!standardId;
}
