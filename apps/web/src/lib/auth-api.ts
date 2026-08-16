import { api, apiOnce, apiOrigin } from "@/lib/api";

export type AuthChallenge = {
  challengeId: string;
  issuedAt: number;
  expiresAt: number;
  token: string;
};

export type PublicUser = {
  id: string;
  email?: string | null;
  isAdmin?: boolean;
  steamId?: string | null;
  personaName: string;
  avatarUrl: string | null;
  profileUrl?: string | null;
  countryCode?: string | null;
  currency?: string;
  hasPassword?: boolean;
  emailVerified?: boolean;
};

export type AuthMeResponse = {
  user: PublicUser | null;
  mailActive?: boolean;
  requireEmailVerification?: boolean;
  entitlements?: {
    recommendations: boolean;
    rewindAi: boolean;
  };
};

export function fetchRegisterChallenge() {
  return apiOnce<AuthChallenge>("/auth/register-challenge");
}

export function fetchLoginChallenge() {
  return apiOnce<AuthChallenge>("/auth/login-challenge");
}

export function fetchSignupStatus() {
  return apiOnce<{ open: boolean; reason: string }>("/auth/signup-status");
}

export async function registerAccount(body: {
  email: string;
  password: string;
  confirmPassword?: string;
  challengeId: string;
  challengeToken: string;
  website?: string;
  company?: string;
  username?: string;
}) {
  return api<{ ok: boolean; user: PublicUser | null }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function loginAccount(body: {
  email: string;
  password: string;
  challengeId: string;
  challengeToken: string;
  website?: string;
  company?: string;
  username?: string;
}) {
  return api<{ ok: boolean; user: PublicUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function steamLinkUrl() {
  return `${apiOrigin()}/auth/steam`;
}

export function requestMagicLink(email: string) {
  return apiOnce<{ ok: boolean }>("/auth/magic", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resendVerification() {
  return api<{ ok: boolean }>("/auth/verify/resend", { method: "POST" });
}

export function requestPasswordReset(email: string) {
  return apiOnce<{ ok: boolean }>("/auth/forgot", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, password: string) {
  return apiOnce<{ ok: boolean }>("/auth/reset", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export function setAccountPassword(body: {
  password: string;
  currentPassword?: string;
}) {
  return api<{ ok: boolean }>("/auth/password", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type ApiHealth = {
  ok?: boolean;
  mail?: { configured?: boolean; enabled?: boolean };
};

export function fetchApiHealth() {
  return apiOnce<ApiHealth>("/health");
}

export function parseApiError(err: unknown): { message: string; status?: number } {
  const statusFromErr =
    err instanceof Error && typeof (err as Error & { status?: number }).status === "number"
      ? (err as Error & { status: number }).status
      : undefined;
  if (!(err instanceof Error)) return { message: "Something went wrong", status: statusFromErr };
  const text = err.message;
  try {
    const json = JSON.parse(text) as {
      message?: string | string[];
      statusCode?: number;
      error?: string;
    };
    const msg = Array.isArray(json.message)
      ? json.message.join(", ")
      : json.message || json.error || text;
    return { message: msg, status: json.statusCode ?? statusFromErr };
  } catch {
    if (text.includes("429") || text.toLowerCase().includes("too many")) {
      return { message: "Too many attempts, try again later", status: 429 };
    }
    return { message: text, status: statusFromErr };
  }
}

/** Anti-abuse challenge failures (not credentials). */
export function isChallengeError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("challenge") ||
    m.includes("please try again") ||
    m.includes("could not start")
  );
}

/**
 * Min-fill delay: challenge is still valid — do not replace it.
 * ("Please try again" from AuthAbuseService before single-use delete.)
 */
export function isChallengeKeepAliveError(message: string): boolean {
  return message.toLowerCase().includes("please try again");
}

/** True when a fresh challenge + one automatic resubmit may help. */
export function shouldAutoRetryChallenge(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("challenge") || m.includes("expired");
}

export function formatAuthError(
  err: unknown,
  kind: "login" | "register",
): string {
  const parsed = parseApiError(err);
  if (parsed.status === 429) {
    return "Too many attempts, try again later";
  }
  if (isChallengeError(parsed.message)) {
    if (parsed.message.toLowerCase().includes("please try again")) {
      return "Please wait a moment and try again.";
    }
    return kind === "login"
      ? "Sign-in session expired. Try again."
      : "Registration session expired. Try again.";
  }
  if (kind === "login") {
    if (
      parsed.status === 401 ||
      parsed.message.toLowerCase().includes("invalid email")
    ) {
      return "Invalid email or password";
    }
  }
  if (kind === "register") {
    // API intentionally avoids email enumeration for most failures.
    if (parsed.message.toLowerCase().includes("unable to create")) {
      return "Unable to create account";
    }
  }
  return parsed.message || "Something went wrong";
}
