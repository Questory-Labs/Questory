import { beforeEach, describe, expect, it, vi } from "vitest";

const providerFetch = vi.hoisted(() => vi.fn());
vi.mock("../../src/lib/qhttp-outbound", () => ({ providerFetch }));

import {
  LastFmApiError,
  LastFmClient,
  signLastFmParams,
} from "../../src/music/scrobbler/lastfm/lastfm.client";

function respond(body: unknown, status = 200) {
  providerFetch.mockResolvedValue(
    new Response(typeof body === "string" ? body : JSON.stringify(body), { status }),
  );
}

function sentUrl(): URL {
  return providerFetch.mock.calls[0][0] as URL;
}

describe("LastFmClient", () => {
  let client: LastFmClient;

  beforeEach(() => {
    providerFetch.mockReset();
    process.env.LASTFM_API_KEY = "key-1";
    process.env.LASTFM_API_SECRET = "secret-1";
    client = new LastFmClient();
  });

  describe("call", () => {
    it("targets the Last.fm endpoint with one retry", async () => {
      respond({ ok: true });
      await client.call("user.getInfo", { user: "rj" });
      const url = sentUrl();
      expect(url.origin + url.pathname).toBe("https://ws.audioscrobbler.com/2.0/");
      expect(url.searchParams.get("method")).toBe("user.getInfo");
      expect(url.searchParams.get("api_key")).toBe("key-1");
      expect(url.searchParams.get("user")).toBe("rj");
      expect(url.searchParams.get("format")).toBe("json");
      expect(providerFetch.mock.calls[0][2]).toEqual({ retries: 1 });
    });

    it("signs everything except format and never sends the secret", async () => {
      respond({ ok: true });
      await client.call("user.getInfo", { user: "rj" });
      const url = sentUrl();
      expect(url.searchParams.get("api_sig")).toBe(
        signLastFmParams(
          { method: "user.getInfo", api_key: "key-1", user: "rj" },
          "secret-1",
        ),
      );
      expect(url.toString()).not.toContain("secret-1");
    });

    it("returns the parsed body", async () => {
      respond({ hello: "world" });
      await expect(client.call("m")).resolves.toEqual({ hello: "world" });
    });

    it("throws LastFmApiError with code and message", async () => {
      respond({ error: 29, message: "Rate limit exceeded" }, 429);
      const err = await client.call("m").catch((e: unknown) => e);
      expect(err).toBeInstanceOf(LastFmApiError);
      expect(err).toMatchObject({
        code: 29,
        message: "Rate limit exceeded",
        name: "LastFmApiError",
      });
    });

    it("prefers a Last.fm error body even on a 200", async () => {
      respond({ error: 9, message: "Invalid session key" }, 200);
      await expect(client.call("m")).rejects.toMatchObject({ code: 9 });
    });

    it("synthesizes a message when Last.fm omits one", async () => {
      respond({ error: 11 });
      await expect(client.call("m")).rejects.toThrow("Last.fm error 11");
    });

    it("fails on non-JSON bodies, naming method and status", async () => {
      respond("<html>bad gateway</html>", 502);
      await expect(client.call("user.getInfo")).rejects.toThrow(
        "Last.fm user.getInfo: invalid JSON (502)",
      );
    });

    it("fails on HTTP errors with a non-error JSON body", async () => {
      respond({ nope: true }, 500);
      await expect(client.call("m")).rejects.toThrow("Last.fm m: HTTP 500");
    });

    it("propagates transport failures", async () => {
      providerFetch.mockRejectedValue(new Error("socket hang up"));
      await expect(client.call("m")).rejects.toThrow("socket hang up");
    });
  });

  describe("LastFmApiError.authFailed", () => {
    it.each([
      [9, true],
      [4, true],
      [29, false],
      [11, false],
      [16, false],
    ])("code %s -> %s", (code, expected) => {
      expect(new LastFmApiError(code, "x").authFailed).toBe(expected);
    });
  });

  describe("auth helpers", () => {
    it("getToken calls auth.getToken", async () => {
      respond({ token: "t" });
      await expect(client.getToken()).resolves.toEqual({ token: "t" });
      expect(sentUrl().searchParams.get("method")).toBe("auth.getToken");
    });

    it("getSession signs the token", async () => {
      respond({ session: { name: "rj", key: "sk" } });
      await client.getSession("tok");
      const url = sentUrl();
      expect(url.searchParams.get("method")).toBe("auth.getSession");
      expect(url.searchParams.get("token")).toBe("tok");
      expect(url.searchParams.get("api_sig")).toBe(
        signLastFmParams(
          { method: "auth.getSession", api_key: "key-1", token: "tok" },
          "secret-1",
        ),
      );
    });
  });

  describe("getRecentTracks", () => {
    it("sends only the required params by default", async () => {
      respond({ recenttracks: { track: [] } });
      await client.getRecentTracks({ user: "rj", limit: 50 });
      const params = sentUrl().searchParams;
      expect(params.get("method")).toBe("user.getRecentTracks");
      expect(params.get("user")).toBe("rj");
      expect(params.get("limit")).toBe("50");
      expect(params.get("extended")).toBe("1");
      expect(params.has("from")).toBe(false);
      expect(params.has("page")).toBe(false);
      expect(params.has("sk")).toBe(false);
    });

    it("sends from, page and sk when provided", async () => {
      respond({ recenttracks: { track: [] } });
      await client.getRecentTracks({
        user: "rj",
        limit: 200,
        from: "1700000000",
        page: 3,
        sk: "session",
      });
      const params = sentUrl().searchParams;
      expect(params.get("from")).toBe("1700000000");
      expect(params.get("page")).toBe("3");
      expect(params.get("sk")).toBe("session");
    });

    it("wraps a lone track object in an array", async () => {
      const track = { name: "T", artist: { name: "A" } };
      respond({ recenttracks: { track } });
      await expect(
        client.getRecentTracks({ user: "rj", limit: 1 }),
      ).resolves.toEqual([track]);
    });

    it("returns an array unchanged", async () => {
      const tracks = [{ name: "1" }, { name: "2" }];
      respond({ recenttracks: { track: tracks } });
      await expect(
        client.getRecentTracks({ user: "rj", limit: 2 }),
      ).resolves.toEqual(tracks);
    });

    it.each([[{}], [{ recenttracks: {} }]])("returns [] for %j", async (body) => {
      respond(body);
      await expect(
        client.getRecentTracks({ user: "rj", limit: 1 }),
      ).resolves.toEqual([]);
    });
  });
});
