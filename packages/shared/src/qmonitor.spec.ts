import { describe, expect, it } from "vitest";
import {
  PlaySessionItemSchema,
  PlaySessionPageSchema,
  QmonitorAuthorizeQuerySchema,
  QmonitorSessionWebhookSchema,
  QmonitorTokenRequestSchema,
} from "./qmonitor";

describe("QmonitorSessionWebhookSchema", () => {
  it("accepts a valid payload", () => {
    const parsed = QmonitorSessionWebhookSchema.safeParse({
      schema_version: 1,
      session_id: "abc",
      source: "steam",
      steam_app_id: 570,
      title: "Dota 2",
      started_at: "2026-01-01T00:00:00.000Z",
      ended_at: "2026-01-01T01:00:00.000Z",
      duration_secs: 3600,
      host: { os: "windows", hostname: "pc" },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects wrong schema_version", () => {
    const parsed = QmonitorSessionWebhookSchema.safeParse({
      schema_version: 2,
      session_id: "abc",
      source: "steam",
      title: "Dota 2",
      started_at: "2026-01-01T00:00:00.000Z",
      ended_at: "2026-01-01T01:00:00.000Z",
      duration_secs: 3600,
      host: { os: "windows", hostname: "pc" },
    });
    expect(parsed.success).toBe(false);
  });
});

describe("QmonitorAuthorizeQuerySchema", () => {
  it("requires S256 PKCE and allowlisted redirect", () => {
    const ok = QmonitorAuthorizeQuerySchema.safeParse({
      client_id: "qmonitor",
      redirect_uri: "http://127.0.0.1:58473/callback",
      state: "abcdefgh",
      scope: "qmonitor",
      code_challenge: "a".repeat(43),
      code_challenge_method: "S256",
      device_id: "d".repeat(16),
      response_type: "code",
    });
    expect(ok.success).toBe(true);

    const bad = QmonitorAuthorizeQuerySchema.safeParse({
      client_id: "qmonitor",
      redirect_uri: "https://evil.example/callback",
      state: "abcdefgh",
      scope: "qmonitor",
      code_challenge: "a".repeat(43),
      code_challenge_method: "S256",
      device_id: "d".repeat(16),
    });
    expect(bad.success).toBe(false);
  });
});

describe("QmonitorTokenRequestSchema", () => {
  it("discriminates grant types", () => {
    const code = QmonitorTokenRequestSchema.safeParse({
      grant_type: "authorization_code",
      code: "x",
      redirect_uri: "http://127.0.0.1:58473/callback",
      client_id: "qmonitor",
      code_verifier: "v".repeat(43),
      device_id: "d".repeat(16),
    });
    expect(code.success).toBe(true);

    const refresh = QmonitorTokenRequestSchema.safeParse({
      grant_type: "refresh_token",
      refresh_token: "r",
      device_id: "d".repeat(16),
      client_id: "qmonitor",
    });
    expect(refresh.success).toBe(true);
  });
});

describe("PlaySessionPageSchema", () => {
  const item = {
    id: "ps1",
    title: "Dota 2",
    source: "steam",
    appId: 570,
    gameId: "g1",
    startedAt: "2026-01-01T00:00:00.000Z",
    endedAt: "2026-01-01T01:00:00.000Z",
    durationSecs: 3600,
    exe: "dota2.exe",
    hostOs: "windows",
    hostName: "pc",
    game: {
      id: "g1",
      name: "Dota 2",
      headerImage: "https://example.com/h.jpg",
      appId: 570,
    },
  };

  it("accepts a page with linked game", () => {
    const parsed = PlaySessionPageSchema.safeParse({
      total: 1,
      page: 1,
      pageSize: 15,
      items: [item],
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts null game and rejects negative duration", () => {
    expect(
      PlaySessionItemSchema.safeParse({ ...item, gameId: null, game: null })
        .success,
    ).toBe(true);
    expect(
      PlaySessionItemSchema.safeParse({ ...item, durationSecs: -1 }).success,
    ).toBe(false);
  });
});
