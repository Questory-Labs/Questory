import { beforeEach, describe, expect, it, vi } from "vitest";
import { LastFmAuth } from "../../src/music/scrobbler/lastfm/lastfm.auth";

describe("LastFmAuth", () => {
  const getToken = vi.fn();
  const getSession = vi.fn();
  const upsert = vi.fn();
  const lastFmStatus = vi.fn();
  const setJson = vi.fn();
  const getJson = vi.fn();
  const del = vi.fn();
  const pollNow = vi.fn().mockResolvedValue(undefined);

  let auth: LastFmAuth;

  beforeEach(() => {
    process.env.LASTFM_API_KEY = "key";
    process.env.LASTFM_API_SECRET = "secret";
    process.env.LASTFM_REDIRECT_URI =
      "http://localhost:4000/v1/music/scrobbler/lastfm/callback";
    getToken.mockReset();
    getSession.mockReset();
    upsert.mockReset();
    lastFmStatus.mockReset();
    setJson.mockReset();
    getJson.mockReset();
    del.mockReset();
    pollNow.mockClear();
    auth = new LastFmAuth(
      { getToken, getSession } as never,
      { upsert, lastFmStatus } as never,
      { setJson, del, getJson } as never,
      { pollNow } as never,
    );
  });

  it("stores the Last.fm session and kicks a catch-up poll", async () => {
    getSession.mockResolvedValue({
      session: { key: "sk", name: "santosh" },
    });
    upsert.mockResolvedValue({});
    await auth.complete("token-1", "u1");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        provider: "lastfm",
        accessToken: "sk",
        externalUserId: "santosh",
      }),
    );
    expect(pollNow).toHaveBeenCalledWith("u1", "lastfm");
  });

  it("sends Last.fm an exact callback URL with no extra query params", async () => {
    getToken.mockResolvedValue({ token: "tok-1" });
    const url = await auth.authorizeUrl("u1");
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://www.last.fm/api/auth/");
    expect(parsed.searchParams.get("api_key")).toBe("key");
    expect(parsed.searchParams.get("token")).toBe("tok-1");
    expect(parsed.searchParams.get("cb")).toBe(
      "http://localhost:4000/v1/music/scrobbler/lastfm/callback",
    );
    expect(parsed.searchParams.get("cb")).not.toContain("state=");
  });

  it("finishes a pending Last.fm session when status is polled after grant", async () => {
    getJson.mockResolvedValue("token-1");
    getSession.mockResolvedValue({
      session: { key: "sk", name: "santosh" },
    });
    lastFmStatus.mockResolvedValue({
      nativeScrobbling: true,
      lastfm: { configured: true, connected: true },
    });
    await auth.status("u1");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", accessToken: "sk" }),
    );
    expect(lastFmStatus).toHaveBeenCalledWith("u1");
  });
});
