import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BangumiService } from "../../src/watch/bangumi/bangumi.service";
import { questoryUserAgent } from "../../src/watch/lib/provider-user-agent";
import {
  callHeaders,
  createListProviderHarness,
  fetchCalls,
  jsonRes,
  textRes,
} from "./list-provider-harness";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock("../../src/watch/lib/provider-fetch", () => ({
  providerFetch: fetchMock,
}));

const API = "https://api.bgm.tv/v0";

function subjectless(count: number) {
  return Array.from({ length: count }, () => ({ type: 3 }));
}

function pages(list: unknown[], username = "someone") {
  let i = 0;
  fetchMock.mockImplementation(async (url: unknown) =>
    String(url).endsWith("/v0/me")
      ? jsonRes({ username })
      : jsonRes(list[i++] ?? { data: [] }),
  );
}

describe("BangumiService.syncList collections", () => {
  let h: ReturnType<typeof createListProviderHarness<BangumiService>>;

  const collectionCalls = () =>
    fetchCalls(fetchMock).filter((c) => c.url.includes("/collections"));
  const offsets = () =>
    collectionCalls().map((c) => new URL(c.url).searchParams.get("offset"));

  beforeEach(() => {
    fetchMock.mockReset();
    h = createListProviderHarness(BangumiService);
  });

  it("resolves the username, then requests anime and manga with bearer and user agent", async () => {
    pages([]);
    await h.service.syncList("u-1");
    const calls = fetchCalls(fetchMock);
    expect(calls.map((c) => c.url)).toEqual([
      `${API}/me`,
      `${API}/users/someone/collections?subject_type=2&limit=100&offset=0`,
      `${API}/users/someone/collections?subject_type=1&limit=100&offset=0`,
    ]);
    for (const call of calls) {
      expect(callHeaders(call)).toEqual({
        Authorization: "Bearer stored-token",
        "User-Agent": questoryUserAgent(),
      });
    }
  });

  it("encodes the username in the collections path", async () => {
    pages([], "a/b c");
    await h.service.syncList("u-1", "watch");
    expect(collectionCalls()[0]!.url).toContain("/users/a%2Fb%20c/collections?");
  });

  it.each([
    ["an empty object", {}],
    ["null", null],
    ["a blank username", { username: "" }],
  ])("fails without fetching collections when /me returns %s", async (_n, body) => {
    fetchMock.mockResolvedValue(jsonRes(body));
    await expect(h.service.syncList("u-1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(h.sourceConnection.update).not.toHaveBeenCalled();
    expect(h.service.isSyncing("u-1")).toBe(false);
  });

  it("fails without fetching collections when /me is rejected", async () => {
    fetchMock.mockResolvedValue(textRes("unauthorized", 401));
    await expect(h.service.syncList("u-1")).rejects.toThrow(/401 unauthorized/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails when a collections page is rejected", async () => {
    fetchMock.mockImplementation(async (url: unknown) =>
      String(url).endsWith("/v0/me")
        ? jsonRes({ username: "someone" })
        : textRes("nope", 404),
    );
    await expect(h.service.syncList("u-1")).rejects.toThrow(/404 nope/);
    expect(h.sourceConnection.update).not.toHaveBeenCalled();
  });

  it("stops after a short page", async () => {
    pages([{ data: subjectless(99) }]);
    await h.service.syncList("u-1", "watch");
    expect(offsets()).toEqual(["0"]);
  });

  it("advances the offset by 100 after a full page", async () => {
    pages([{ data: subjectless(100) }, { data: subjectless(100) }, { data: [] }]);
    await h.service.syncList("u-1", "watch");
    expect(offsets()).toEqual(["0", "100", "200"]);
  });

  it("stops without another request once the reported total is reached", async () => {
    pages([{ data: subjectless(100), total: 100 }]);
    await h.service.syncList("u-1", "watch");
    expect(offsets()).toEqual(["0"]);
  });

  it("continues when the reported total exceeds the offset", async () => {
    pages([
      { data: subjectless(100), total: 150 },
      { data: subjectless(50), total: 150 },
    ]);
    await h.service.syncList("u-1", "watch");
    expect(offsets()).toEqual(["0", "100"]);
  });

  it("tolerates a response with no data key", async () => {
    pages([{}]);
    const result = await h.service.syncList("u-1", "watch");
    expect(result.accepted).toBe(0);
  });

  it("skips entries with no subject in both domains", async () => {
    pages([{ data: subjectless(2) }, { data: subjectless(2) }]);
    const result = await h.service.syncList("u-1");
    expect(result).toMatchObject({ accepted: 0, mangaAccepted: 0 });
    expect(h.catalog.upsertTitle).not.toHaveBeenCalled();
    expect(h.readCatalog.upsertTitle).not.toHaveBeenCalled();
  });
});
