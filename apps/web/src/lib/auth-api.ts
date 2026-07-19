import { api, apiOrigin } from "@/lib/api";

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
};

export function fetchRegisterChallenge() {
  return api<AuthChallenge>("/auth/register-challenge");
}

export function fetchLoginChallenge() {
  return api<AuthChallenge>("/auth/login-challenge");
}

export function fetchSignupStatus() {
  return api<{ open: boolean; reason: string }>("/auth/signup-status");
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

export function parseApiError(err: unknown): { message: string; status?: number } {
  if (!(err instanceof Error)) return { message: "Something went wrong" };
  const text = err.message;
  try {
    const json = JSON.parse(text) as {
      message?: string | string[];
      statusCode?: number;
    };
    const msg = Array.isArray(json.message)
      ? json.message.join(", ")
      : json.message || text;
    return { message: msg, status: json.statusCode };
  } catch {
    if (text.includes("429") || text.toLowerCase().includes("too many")) {
      return { message: "Too many attempts, try again later", status: 429 };
    }
    return { message: text };
  }
}
