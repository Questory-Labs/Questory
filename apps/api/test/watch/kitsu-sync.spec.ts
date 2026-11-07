import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KitsuService } from "../../src/watch/kitsu/kitsu.service";
import {
  callHeaders,
  createListProviderHarness,
  fetchCalls,
  jsonRes,
} from "./list-provider-harness";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock("../../src/watch/lib/provider-fetch", () => ({
  providerFetch: fetchMock,
}));

const API = "https://kitsu.io/api/edge";
const UPDATED = "2026-03-01T10:00:00.000Z";
const FINISHED = "2026-02-01T10:00:00.000Z";

type Kind = "anime" | "manga";

function media(id: string, attributes: Record<string, unknown> = {}) {
  return { id, attributes: { canonicalTitle: `Title ${id}`, ...attributes } };
}

function entry(
  id: string,
  kind: Kind,
  mediaId: string | null,
  attributes: Record<string, unknown> = {},
) {
  return {
    id,
    attributes: {
      status: "current",
      progress: 0,
      updatedAt: UPDATED,
      ...attributes,
    },
    relationships: {
      [kind]: { data: mediaId ? { id: mediaId, type: kind } : null },
    },
  };
}

function routes(pages: Partial<Record<Kind, unknown[]>>) {
  const cursor = { anime: 0, manga: 0 };
  fetchMock.mockImplementation(async (rawUrl: unknown) => {
    const url = String(rawUrl);
    if (url.includes("/users?")) return jsonRes({ data: [{ id: "9" }] });
    const kind: Kind = url.includes("filter[kind]=anime") ? "anime" : "manga";
    const page = pages[kind]?.[cursor[kind]++];
    return jsonRes(page ?? { data: [] });
  });
}

describe("KitsuService.syncList", () => {
  let h: ReturnType<typeof createListProviderHarness<KitsuService>>;

  beforeEach(() => {
    fetchMock.mockReset();
    h = createListProviderHarness(KitsuService);
  });

  describe("requests", () => {
    it("looks up the profile, then pages library entries with bearer and JSON:API headers", async () => {
      routes({});
      await h.service.syncList("u-1");
      const calls = fetchCalls(fetchMock);
      expect(calls.map((c) => c.url)).toEqual([
        `${API}/users?filter[self]=true`,
        `${API}/library-entries?filter[user_id]=9&filter[kind]=anime&include=anime&page[limit]=100&page[offset]=0`,
        `${API}/library-entries?filter[user_id]=9&filter[kind]=manga&include=manga&page[limit]=100&page[offset]=0`,
      ]);
      for (const call of calls) {
        expect(callHeaders(call)).toEqual({
          Authorization: "Bearer stored-token",
          Accept: "application/vnd.api+json",
        });
      }
    });

    it("stores the Kitsu user id on the connection", async () => {
      routes({});
      await h.service.syncList("u-1");
      expect(h.sourceConnection.update.mock.calls[0]?.[0].data.externalUserId).toBe(
        "9",
      );
    });

    it.each([
      ["empty data", { data: [] }],
      ["no data key", {}],
    ])("fails when the profile has %s", async (_n, body) => {
      fetchMock.mockResolvedValue(jsonRes(body));
      await expect(h.service.syncList("u-1")).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(h.sourceConnection.update).not.toHaveBeenCalled();
      expect(h.service.isSyncing("u-1")).toBe(false);
    });
  });

  describe("pagination", () => {
    const page = (id: string, next?: string) => ({
      data: [entry(id, "anime", id, { status: "completed" })],
      included: [media(id)],
      links: next ? { next } : {},
    });

    it("advances the offset by 100 while links.next is present", async () => {
      routes({ anime: [page("1", "n"), page("2", "n"), page("3")] });
      const result = await h.service.syncList("u-1", "watch");
      expect(result.accepted).toBe(3);
      const offsets = fetchCalls(fetchMock)
        .filter((c) => c.url.includes("library-entries"))
        .map((c) => new URL(c.url).searchParams.get("page[offset]"));
      expect(offsets).toEqual(["0", "100", "200"]);
    });

    it("stops on an empty page even when links.next is set", async () => {
      routes({ anime: [{ data: [], links: { next: "n" } }] });
      await h.service.syncList("u-1", "watch");
      expect(
        fetchCalls(fetchMock).filter((c) => c.url.includes("library-entries")),
      ).toHaveLength(1);
    });

    it("tolerates a page with no data or included keys", async () => {
      routes({ anime: [{}] });
      const result = await h.service.syncList("u-1", "watch");
      expect(result.accepted).toBe(0);
    });
  });

  describe("anime entries", () => {
    const run = async (e: unknown, included: unknown[]) => {
      routes({ anime: [{ data: [e], included }] });
      return h.service.syncList("u-1", "watch");
    };

    it("records a completed entry", async () => {
      const result = await run(
        entry("e1", "anime", "42", {
          status: "completed",
          progress: 12,
          ratingTwenty: 17,
          finishedAt: FINISHED,
        }),
        [
          media("42", {
            episodeCount: 12,
            startDate: "2024-04-01",
            posterImage: { large: "L", medium: "M" },
          }),
        ],
      );

      expect(result.accepted).toBe(1);
      expect(h.catalog.upsertTitle).toHaveBeenCalledWith({
        type: "show",
        name: "Title 42",
        year: 2024,
        kitsuId: 42,
        posterUrl: "L",
      });
      expect(h.catalog.recordWatch).toHaveBeenCalledWith({
        userId: "u-1",
        titleId: "title-1",
        watchedAt: new Date(FINISHED),
        source: "kitsu",
        dedupeKey: "kitsu:list:e1:completed:12",
        action: "import",
        progress: 100,
        rating: 8.5,
        precision: "day",
      });
      expect(h.catalog.upsertListState).toHaveBeenCalledWith({
        userId: "u-1",
        titleId: "title-1",
        listType: "rating",
        source: "kitsu",
        rating: 8.5,
        listedAt: new Date(FINISHED),
      });
      expect(h.enrichment.enqueueTitle).toHaveBeenCalledWith("title-1");
    });

    it("uses updatedAt and unknown precision without finishedAt", async () => {
      await run(entry("e1", "anime", "1", { progress: 3 }), [
        media("1", { episodeCount: 12 }),
      ]);
      const watch = h.catalog.recordWatch.mock.calls[0]?.[0];
      expect(watch.watchedAt).toEqual(new Date(UPDATED));
      expect(watch.precision).toBe("unknown");
      expect(watch.progress).toBe(25);
      expect(watch.rating).toBeNull();
    });

    it.each([
      [{ en_us: "US", en_jp: "JP" }, "US"],
      [{ en_jp: "JP" }, "JP"],
      [{ en_us: "", en_jp: "" }, "Title 1"],
      [undefined, "Title 1"],
    ])("resolves titles %j to %s", async (titles, name) => {
      await run(entry("e1", "anime", "1"), [media("1", { titles })]);
      expect(h.catalog.upsertTitle.mock.calls[0]?.[0].name).toBe(name);
    });

    it.each([
      [{ large: "L", medium: "M" }, "L"],
      [{ medium: "M" }, "M"],
      [{}, null],
      [undefined, null],
    ])("resolves poster %j to %s", async (posterImage, url) => {
      await run(entry("e1", "anime", "1"), [media("1", { posterImage })]);
      expect(h.catalog.upsertTitle.mock.calls[0]?.[0].posterUrl).toBe(url);
    });

    it("nulls an unparsable media id and start date", async () => {
      await run(entry("e1", "anime", "abc"), [
        media("abc", { startDate: "unknown" }),
      ]);
      const title = h.catalog.upsertTitle.mock.calls[0]?.[0];
      expect(title.kitsuId).toBeNull();
      expect(title.year).toBeNull();
    });

    it("catalogs but does not count a planned entry with no progress", async () => {
      const result = await run(
        entry("e1", "anime", "1", { status: "planned" }),
        [media("1")],
      );
      expect(result.accepted).toBe(0);
      expect(h.catalog.upsertTitle).toHaveBeenCalledTimes(1);
      expect(h.catalog.recordWatch).not.toHaveBeenCalled();
      expect(h.catalog.upsertListState).not.toHaveBeenCalled();
      expect(h.enrichment.enqueueTitle).toHaveBeenCalledWith("title-1");
    });

    it("records partial progress on a dropped entry and marks it dropped", async () => {
      const result = await run(
        entry("e1", "anime", "1", { status: "dropped", progress: 2 }),
        [media("1", { episodeCount: 4 })],
      );
      expect(result.accepted).toBe(1);
      expect(h.catalog.recordWatch.mock.calls[0]?.[0].progress).toBe(50);
      expect(h.catalog.syncDroppedListState).toHaveBeenCalledWith({
        userId: "u-1",
        titleId: "title-1",
        source: "kitsu",
        dropped: true,
        listedAt: new Date(UPDATED),
      });
    });

    it("clears the dropped state for active entries", async () => {
      await run(entry("e1", "anime", "1"), [media("1")]);
      expect(h.catalog.syncDroppedListState.mock.calls[0]?.[0].dropped).toBe(false);
    });

    it("treats a zero rating as unrated", async () => {
      await run(entry("e1", "anime", "1", { ratingTwenty: 0 }), [media("1")]);
      expect(h.catalog.recordWatch.mock.calls[0]?.[0].rating).toBeNull();
      expect(h.catalog.upsertListState).not.toHaveBeenCalled();
    });

    it("defaults progress to 50 when the total is unknown", async () => {
      await run(entry("e1", "anime", "1", { progress: 3 }), [media("1")]);
      expect(h.catalog.recordWatch.mock.calls[0]?.[0].progress).toBe(50);
    });

    it.each([
      ["a null relationship", entry("e1", "anime", null), [media("1")]],
      ["media absent from included", entry("e1", "anime", "404"), [media("1")]],
      ["no included block", entry("e1", "anime", "1"), []],
    ])("skips %s", async (_n, e, included) => {
      const result = await run(e, included);
      expect(result.accepted).toBe(0);
      expect(h.catalog.upsertTitle).not.toHaveBeenCalled();
    });

    it("skips an entry with no relationships and keeps syncing the rest", async () => {
      routes({
        anime: [
          {
            data: [
              { id: "bad", attributes: { status: "current", progress: 1, updatedAt: UPDATED } },
              entry("e1", "anime", "1"),
            ],
            included: [media("1")],
          },
        ],
      });
      const result = await h.service.syncList("u-1", "watch");
      expect(result.accepted).toBe(1);
      expect(h.catalog.upsertTitle).toHaveBeenCalledTimes(1);
    });

    it("produces a stable dedupe key that changes with progress", async () => {
      const key = async (progress: number) => {
        h.catalog.recordWatch.mockClear();
        await run(entry("e1", "anime", "1", { progress }), [media("1")]);
        return h.catalog.recordWatch.mock.calls[0]?.[0].dedupeKey;
      };
      expect(await key(3)).toBe(await key(3));
      expect(await key(3)).not.toBe(await key(4));
    });

    it("writes every row under the resolved user, not the requested id", async () => {
      h.users.resolveUser.mockResolvedValue({ id: "resolved" });
      await run(entry("e1", "anime", "1", { ratingTwenty: 10 }), [media("1")]);
      expect(h.catalog.recordWatch.mock.calls[0]?.[0].userId).toBe("resolved");
      expect(h.catalog.upsertListState.mock.calls[0]?.[0].userId).toBe("resolved");
      expect(h.catalog.syncDroppedListState.mock.calls[0]?.[0].userId).toBe(
        "resolved",
      );
    });

    it("fails the sync and skips the timestamp when the catalog rejects", async () => {
      h.catalog.upsertTitle.mockRejectedValue(new Error("db down"));
      await expect(
        run(entry("e1", "anime", "1"), [media("1")]),
      ).rejects.toThrow("db down");
      expect(h.sourceConnection.update).not.toHaveBeenCalled();
      expect(h.service.isSyncing("u-1")).toBe(false);
    });
  });

  describe("manga entries", () => {
    const run = async (e: unknown, included: unknown[]) => {
      routes({ manga: [{ data: [e], included }] });
      return h.service.syncList("u-1", "read");
    };

    it("records list state and progress for a current entry", async () => {
      const result = await run(
        entry("m1", "manga", "7", { progress: 10, ratingTwenty: 12 }),
        [
          media("7", {
            chapterCount: 40,
            volumeCount: 5,
            startDate: "2019-01-01",
            posterImage: { medium: "M" },
          }),
        ],
      );

      expect(result).toMatchObject({ accepted: 0, mangaAccepted: 1 });
      expect(h.readCatalog.upsertTitle).toHaveBeenCalledWith({
        format: "manga",
        name: "Title 7",
        year: 2019,
        chapters: 40,
        volumes: 5,
        kitsuId: 7,
        coverUrl: "M",
      });
      expect(h.readCatalog.upsertListState).toHaveBeenCalledWith({
        userId: "u-1",
        readTitleId: "read-1",
        listStatus: "reading",
        source: "kitsu",
        score: 6,
        progressChapters: 10,
        progressVolumes: 0,
        listedAt: new Date(UPDATED),
      });
      expect(h.readCatalog.recordProgress).toHaveBeenCalledWith({
        userId: "u-1",
        readTitleId: "read-1",
        readAt: new Date(UPDATED),
        source: "kitsu",
        dedupeKey: "kitsu:manga:m1:current:10",
        action: "import",
        status: "current",
        chaptersRead: 10,
        progress: 25,
        rating: 6,
        precision: "unknown",
        chaptersTotal: 10,
      });
      expect(h.catalog.upsertTitle).not.toHaveBeenCalled();
    });

    it("counts a planned entry without recording progress", async () => {
      const result = await run(
        entry("m1", "manga", "7", { status: "planned", progress: 3 }),
        [media("7")],
      );
      expect(result.mangaAccepted).toBe(1);
      expect(h.readCatalog.upsertListState.mock.calls[0]?.[0].listStatus).toBe(
        "planning",
      );
      expect(h.readCatalog.recordProgress).not.toHaveBeenCalled();
    });

    it("keeps list state but no progress for an idle paused entry", async () => {
      const result = await run(
        entry("m1", "manga", "7", { status: "on_hold" }),
        [media("7")],
      );
      expect(result.mangaAccepted).toBe(0);
      expect(h.readCatalog.upsertListState.mock.calls[0]?.[0].listStatus).toBe(
        "paused",
      );
      expect(h.readCatalog.recordProgress).not.toHaveBeenCalled();
    });

    it("records completed with zero chapters as null chaptersRead at 100%", async () => {
      await run(
        entry("m1", "manga", "7", {
          status: "completed",
          finishedAt: FINISHED,
        }),
        [media("7")],
      );
      const progress = h.readCatalog.recordProgress.mock.calls[0]?.[0];
      expect(progress.chaptersRead).toBeNull();
      expect(progress.progress).toBe(100);
      expect(progress.precision).toBe("day");
      expect(progress.readAt).toEqual(new Date(FINISHED));
    });

    it("nulls missing chapter and volume counts", async () => {
      await run(entry("m1", "manga", "7"), [media("7")]);
      const title = h.readCatalog.upsertTitle.mock.calls[0]?.[0];
      expect(title.chapters).toBeNull();
      expect(title.volumes).toBeNull();
    });

    it("ignores the anime relationship when syncing manga", async () => {
      const result = await run(entry("m1", "anime", "7"), [media("7")]);
      expect(result.mangaAccepted).toBe(0);
      expect(h.readCatalog.upsertTitle).not.toHaveBeenCalled();
    });
  });
});
