/** Small built-in disposable / throwaway domain blocklist. */
const BUILTIN = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "sharklasers.com",
  "grr.la",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "yopmail.com",
  "trashmail.com",
  "discard.email",
  "getnada.com",
  "maildrop.cc",
  "throwaway.email",
  "fakeinbox.com",
]);

export function isDisposableEmailDomain(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return true;
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase()
    .normalize("NFC");
  if (!domain || BUILTIN.has(domain)) return true;

  const extra = (process.env.AUTH_BLOCKED_EMAIL_DOMAINS || "")
    .split(/[,\s]+/)
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  return extra.includes(domain);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().normalize("NFC");
}

export function allowEmailPlus(): boolean {
  const raw = (process.env.AUTH_ALLOW_EMAIL_PLUS || "true").trim().toLowerCase();
  return raw !== "0" && raw !== "false" && raw !== "no";
}
