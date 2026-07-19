/**
 * Allow only same-origin relative paths for notification / in-app links.
 * Blocks javascript:, data:, protocol-relative, and absolute URLs.
 */
export function sanitizeAppHref(href: string | null | undefined): string | null {
  if (href == null) return null;
  const value = String(href).trim();
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) {
    if (value.includes("\\") || value.includes("\0")) return null;
    return value;
  }
  return null;
}
