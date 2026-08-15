import { beforeEach, describe, expect, it, vi } from "vitest";
import { LastFmAuth } from "../../src/music/scrobbler/lastfm/lastfm.auth";

describe("LastFmAuth", () => {
  const getToken = vi.fn();
  const getSession = vi.fn();
  const upsert = vi.fn();
  const setJson = vi.fn();
  const del = vi.fn();
  const pollNow = vi.fn().mockResolvedValue(undefined);

  let auth: LastFmAuth;

  beforeEach(() => {
    process.env.LASTFM_API_KEY = "key";
    process.env.LASTFM_API_SECRET = "secret";
    getToken.mockReset();
    getSession.mockReset();
    upsert.mockReset();
    setJson.mockReset();
    del.mockReset();
    pollNow.mockClear();
    auth = new LastFmAuth(
      { getToken, getSession } as never,
      { upsert } as never,
      { setJson, del, getJson: vi.fn() } as never,
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
});
