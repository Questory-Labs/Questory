export const DEMO_EMAIL = "demo@questorylabs.com";
export const DEMO_USER_ID = "demo-user";
export const DEMO_SESSION_TTL_MS = 60 * 60 * 1000;
export const DEMO_READ_ONLY_CODE = "DEMO_READ_ONLY";
export const DEMO_READ_ONLY_MESSAGE = "Demo is read-only";

export const DEMO_READ_POST_PATHS = [
  "/auth/logout",
  "/multiplayer/plan",
  "/recommendations",
  "/recommendations/curate",
  "/recommendations/curate/cache",
  "/recommendations/goals",
  "/recommendations/goals/ai",
  "/recommendations/search",
  "/recommendations/weekly-digest",
  "/recommendations/weekly-digest/cache",
] as const;

export const DEMO_CURATE_QUESTIONS = [
  "Something cozy I can finish in one weekend",
  "A co-op game to play with two friends tonight",
  "A deep story game for a long rainy evening",
] as const;

const READ_POST_SET = new Set<string>(DEMO_READ_POST_PATHS);

export function isDemoEmail(email: string): boolean {
  return email.trim().toLowerCase().normalize("NFC") === DEMO_EMAIL;
}

export function normalizeDemoPath(path: string): string {
  const withoutVersion = path.replace(/^\/v1(?=\/|$)/, "");
  const trimmed = withoutVersion.replace(/\/+$/, "");
  return trimmed || "/";
}

export function isDemoReadPost(path: string): boolean {
  return READ_POST_SET.has(normalizeDemoPath(path));
}

export function isDemoAllowedRequest(method: string, path: string): boolean {
  const verb = method.toUpperCase();
  if (verb === "GET" || verb === "HEAD") return true;
  return verb === "POST" && isDemoReadPost(path);
}
