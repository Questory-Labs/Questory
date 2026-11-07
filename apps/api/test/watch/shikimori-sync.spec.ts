import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShikimoriService } from "../../src/watch/shikimori/shikimori.service";
import { shikimoriUserAgent } from "../../src/watch/lib/provider-user-agent";
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

const API = "https://shikimori.one";
const UPDATED = "2026-03-01T10:00:00.000Z";

function mediaOf(id: number, extra: Record<string, unknown> = {}) {
  return { id, name: `Name ${id}`, ...extra };
}

function rate(
  id: number,
  extra: Record<string, unknown> = {},
) {
  return {
    id,
    score: 0,
    status: "watching",
    updated_at: UPDATED,
    created_at: UPDATED,
    ...extra,
  };
}

function routes(pages: { anime?: unknown[][]; manga?: unknown[][] }) {
  const cursor = { anime: 0, manga: 0 };
  fetchMock.mockImplementation(async (rawUrl: unknown) => {
    const url = String(rawUrl);
    if (url.endsWith("/api/users/whoami")) return jsonRes({ id: 7 });
    const kind = url.includes("/anime_rates") ? "anime" : "manga";
    return jsonRes(pages[kind]?.[cursor[kind]++] ?? []);
  });
}

describe("ShikimoriService.syncList", () => {
  let h: ReturnType<typeof createListProviderHarness<ShikimoriService>>;

  beforeEach(() => {
    fetchMock.mockReset();
    h = createListProviderHarness(ShikimoriService);
  });

  describe("requests", () => {
    it("resolves the profile, then pages rates with bearer and user agent", async () => {
      routes({});
      await h.service.syncList("u-1");
      const calls = fetchCalls(fetchMock);
      expect(calls.map((c) => c.url)).toEqual([
        `${API}/api/users/whoami`,
        `${API}/api/users/7/anime_rates?limit=50&page=1`,
        `${API}/api/users/7/manga_rates?limit=50&page=1`,
      ]);
      for (const call of calls) {
        expect(callHeaders(call)).toEqual({
          Authorization: "Bearer stored-token",
          "User-Agent": shikimoriUserAgent(),
        });
      }
    });

    it("stores the profile id as a string", async () => {
      routes({});
      await h.service.syncList("u-1");
      expect(h.sourceConnection.update.mock.calls[0]?.[0].data.externalUserId).toBe(
        "7",
      );
    });

    it.each([
      ["an empty object", {}],
      ["null", null],
      ["a zero id", { id: 0 }],
    ])("fails without fetching rates when whoami returns %s", async (_n, body) => {
      fetchMock.mockResolvedValue(jsonRes(body));
      await expect(h.service.syncList("u-1")).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(h.sourceConnection.update).not.toHaveBeenCalled();
      expect(h.service.isSyncing("u-1")).toBe(false);
    });

    it("fails without fetching rates when whoami is rejected", async () => {
      fetchMock.mockResolvedValue(textRes("unauthorized", 401));
      await expect(h.service.syncList("u-1")).rejects.toThrow(
        /whoami: 401 unauthorized/,
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(h.sourceConnection.update).not.toHaveBeenCalled();
    });
  });

  describe("pagination", () => {
    const full = (start: number) =>
      Array.from({ length: 50 }, (_, i) =>
        rate(start + i, { anime: mediaOf(start + i) }),
      );

    const animePages = () =>
      fetchCalls(fetchMock)
        .filter((c) => c.url.includes("anime_rates"))
        .map((c) => new URL(c.url).searchParams.get("page"));

    it("stops after a short page", async () => {
      routes({ anime: [[rate(1, { anime: mediaOf(1) })]] });
      await h.service.syncList("u-1", "watch");
      expect(animePages()).toEqual(["1"]);
    });

    it("requests the next page after a full page", async () => {
      routes({ anime: [full(1), full(51), [rate(101, { anime: mediaOf(101) })]] });
      const result = await h.service.syncList("u-1", "watch");
      expect(animePages()).toEqual(["1", "2", "3"]);
      expect(result.accepted).toBe(101);
    });

    it("stops when a full page is followed by an empty one", async () => {
      routes({ anime: [full(1), []] });
      const result = await h.service.syncList("u-1", "watch");
      expect(animePages()).toEqual(["1", "2"]);
      expect(result.accepted).toBe(50);
    });
  });

  describe("anime rates", () => {
    const run = async (r: unknown) => {
      routes({ anime: [[r]] });
      return h.service.syncList("u-1", "watch");
    };

    it("maps a rated completed title", async () => {
      const result = await run(
        rate(5, {
          status: "completed",
          score: 9,
          episodes: 12,
          anime: mediaOf(11, {
            russian: "Русский",
            mal_id: 99,
            episodes: 12,
            image: { original: "/system/a.jpg" },
            aired_on: { date: "2021-07-01" },
          }),
        }),
      );

      expect(result.accepted).toBe(1);
      expect(h.catalog.upsertTitle).toHaveBeenCalledWith({
        type: "show",
        name: "Русский",
        year: 2021,
        shikimoriId: 11,
        malId: 99,
        posterUrl: `${API}/system/a.jpg`,
      });
      expect(h.catalog.recordWatch).toHaveBeenCalledWith({
        userId: "u-1",
        titleId: "title-1",
        watchedAt: new Date(UPDATED),
        source: "shikimori",
        dedupeKey: "shikimori:list:5:completed:12",
        action: "import",
        progress: 100,
        rating: 9,
        precision: "unknown",
      });
      expect(h.catalog.upsertListState).toHaveBeenCalledWith({
        userId: "u-1",
        titleId: "title-1",
        listType: "rating",
        source: "shikimori",
        rating: 9,
        listedAt: new Date(UPDATED),
      });
      expect(h.enrichment.enqueueTitle).toHaveBeenCalledWith("title-1");
    });

    it("falls back to the romanized name and nulls absent metadata", async () => {
      await run(rate(5, { anime: mediaOf(11) }));
      expect(h.catalog.upsertTitle).toHaveBeenCalledWith({
        type: "show",
        name: "Name 11",
        year: null,
        shikimoriId: 11,
        malId: null,
        posterUrl: null,
      });
    });

    it("nulls an unparsable air date", async () => {
      await run(rate(5, { anime: mediaOf(11, { aired_on: { date: "soon" } }) }));
      expect(h.catalog.upsertTitle.mock.calls[0]?.[0].year).toBeNull();
    });

    it("computes progress from watched and total episodes", async () => {
      await run(rate(5, { episodes: 3, anime: mediaOf(11, { episodes: 12 }) }));
      expect(h.catalog.recordWatch.mock.calls[0]?.[0].progress).toBe(25);
    });

    it("catalogs but does not count a planned rate with no episodes", async () => {
      const result = await run(
        rate(5, { status: "planned", anime: mediaOf(11) }),
      );
      expect(result.accepted).toBe(0);
      expect(h.catalog.upsertTitle).toHaveBeenCalledTimes(1);
      expect(h.catalog.recordWatch).not.toHaveBeenCalled();
      expect(h.catalog.syncDroppedListState.mock.calls[0]?.[0].dropped).toBe(false);
    });

    it("records partial progress on a dropped rate and marks it dropped", async () => {
      const result = await run(
        rate(5, {
          status: "dropped",
          episodes: 2,
          anime: mediaOf(11, { episodes: 4 }),
        }),
      );
      expect(result.accepted).toBe(1);
      expect(h.catalog.syncDroppedListState).toHaveBeenCalledWith({
        userId: "u-1",
        titleId: "title-1",
        source: "shikimori",
        dropped: true,
        listedAt: new Date(UPDATED),
      });
    });

    it("treats a zero score as unrated", async () => {
      await run(rate(5, { anime: mediaOf(11) }));
      expect(h.catalog.recordWatch.mock.calls[0]?.[0].rating).toBeNull();
      expect(h.catalog.upsertListState).not.toHaveBeenCalled();
    });

    it("skips a rate with no embedded anime", async () => {
      const result = await run(rate(5));
      expect(result.accepted).toBe(0);
      expect(h.catalog.upsertTitle).not.toHaveBeenCalled();
    });

    it("produces a stable dedupe key that changes with episodes", async () => {
      const key = async (episodes: number) => {
        h.catalog.recordWatch.mockClear();
        await run(rate(5, { episodes, anime: mediaOf(11) }));
        return h.catalog.recordWatch.mock.calls[0]?.[0].dedupeKey;
      };
      expect(await key(3)).toBe(await key(3));
      expect(await key(3)).not.toBe(await key(4));
    });

    it("writes every row under the resolved user", async () => {
      h.users.resolveUser.mockResolvedValue({ id: "resolved" });
      await run(rate(5, { score: 7, anime: mediaOf(11) }));
      expect(h.catalog.recordWatch.mock.calls[0]?.[0].userId).toBe("resolved");
      expect(h.catalog.upsertListState.mock.calls[0]?.[0].userId).toBe("resolved");
      expect(h.catalog.syncDroppedListState.mock.calls[0]?.[0].userId).toBe(
        "resolved",
      );
    });

    it("fails the sync when the catalog rejects", async () => {
      h.catalog.recordWatch.mockRejectedValue(new Error("db down"));
      await expect(run(rate(5, { anime: mediaOf(11) }))).rejects.toThrow("db down");
      expect(h.sourceConnection.update).not.toHaveBeenCalled();
      expect(h.service.isSyncing("u-1")).toBe(false);
    });
  });

  describe("manga rates", () => {
    const run = async (r: unknown) => {
      routes({ manga: [[r]] });
      return h.service.syncList("u-1", "read");
    };

    it("maps list state and progress for a reading rate", async () => {
      const result = await run(
        rate(8, {
          status: "reading",
          score: 6,
          chapters: 10,
          volumes: 2,
          manga: mediaOf(21, {
            russian: "Манга",
            mal_id: 44,
            chapters: 40,
            volumes: 8,
            image: { original: "/system/m.jpg" },
            aired_on: { date: "2018-02-01" },
          }),
        }),
      );

      expect(result).toMatchObject({ accepted: 0, mangaAccepted: 1 });
      expect(h.readCatalog.upsertTitle).toHaveBeenCalledWith({
        format: "manga",
        name: "Манга",
        year: 2018,
        chapters: 40,
        volumes: 8,
        shikimoriId: 21,
        malId: 44,
        coverUrl: `${API}/system/m.jpg`,
      });
      expect(h.readCatalog.upsertListState).toHaveBeenCalledWith({
        userId: "u-1",
        readTitleId: "read-1",
        listStatus: "reading",
        source: "shikimori",
        score: 6,
        progressChapters: 10,
        progressVolumes: 2,
        listedAt: new Date(UPDATED),
      });
      expect(h.readCatalog.recordProgress).toHaveBeenCalledWith({
        userId: "u-1",
        readTitleId: "read-1",
        readAt: new Date(UPDATED),
        source: "shikimori",
        dedupeKey: "shikimori:manga:8:reading:10:2",
        action: "import",
        status: "reading",
        chaptersRead: 10,
        volumesRead: 2,
        progress: 25,
        rating: 6,
        precision: "unknown",
        chaptersTotal: 10,
      });
    });

    it("counts a planned rate without recording progress", async () => {
      const result = await run(
        rate(8, { status: "planned", chapters: 2, manga: mediaOf(21) }),
      );
      expect(result.mangaAccepted).toBe(1);
      expect(h.readCatalog.upsertListState.mock.calls[0]?.[0].listStatus).toBe(
        "planning",
      );
      expect(h.readCatalog.recordProgress).not.toHaveBeenCalled();
    });

    it("keeps list state but no progress for an idle paused rate", async () => {
      const result = await run(
        rate(8, { status: "on_hold", manga: mediaOf(21) }),
      );
      expect(result.mangaAccepted).toBe(0);
      expect(h.readCatalog.upsertListState.mock.calls[0]?.[0].listStatus).toBe(
        "paused",
      );
      expect(h.readCatalog.recordProgress).not.toHaveBeenCalled();
    });

    it("records progress from volumes alone", async () => {
      const result = await run(
        rate(8, { status: "on_hold", volumes: 2, manga: mediaOf(21) }),
      );
      expect(result.mangaAccepted).toBe(1);
      const progress = h.readCatalog.recordProgress.mock.calls[0]?.[0];
      expect(progress.chaptersRead).toBeNull();
      expect(progress.volumesRead).toBe(2);
      expect(progress.chaptersTotal).toBe(0);
    });

    it("maps rereading to repeating", async () => {
      await run(rate(8, { status: "rereading", chapters: 1, manga: mediaOf(21) }));
      expect(h.readCatalog.upsertListState.mock.calls[0]?.[0].listStatus).toBe(
        "repeating",
      );
    });

    it("records a completed rate at 100% with null counts", async () => {
      await run(rate(8, { status: "completed", manga: mediaOf(21) }));
      const progress = h.readCatalog.recordProgress.mock.calls[0]?.[0];
      expect(progress.progress).toBe(100);
      expect(progress.chaptersRead).toBeNull();
      expect(progress.volumesRead).toBeNull();
    });

    it("skips a rate with no embedded manga", async () => {
      const result = await run(rate(8, { anime: mediaOf(21) }));
      expect(result.mangaAccepted).toBe(0);
      expect(h.readCatalog.upsertTitle).not.toHaveBeenCalled();
    });
  });
});
