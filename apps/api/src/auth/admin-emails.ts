/** Parse ADMIN_EMAILS env (comma/whitespace separated, normalized lowercase). */
export function resolveAdminEmails(
  raw = process.env.ADMIN_EMAILS,
): Set<string> {
  const ids = (raw || "")
    .split(/[,\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return new Set(ids);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return resolveAdminEmails().has(email.trim().toLowerCase());
}

/** Effective admin: DB flag OR ADMIN_EMAILS membership. */
export function isEffectiveAdmin(user: {
  isAdmin?: boolean;
  email?: string | null;
}): boolean {
  return Boolean(user.isAdmin) || isAdminEmail(user.email);
}
