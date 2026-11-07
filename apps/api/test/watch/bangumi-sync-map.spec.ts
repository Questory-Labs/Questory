import { beforeEach, describe, expect, it, vi } from "vitest";
import { BangumiService } from "../../src/watch/bangumi/bangumi.service";
import { createListProviderHarness, jsonRes } from "./list-provider-harness";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock("../../src/watch/lib/provider-fetch", () => ({
  providerFetch: fetchMock,
}));

const UPDATED = "2026-03-01T10:00:00.000Z";
const WISH = 1;
const DONE = 2;
const DOING = 3;
const ON_HOLD = 4;
const DROPPED = 5;

function subject(id = 11, extra: Record<string, unknown> = {}) {
  return { id, name: `JP ${id}`, ...extra };
}

function collection(type: unknown, extra: Record<string, unknown> = {}) {
  return {
    subject_id: 11,
    type,
    rate: 0,
    ep_status: 0,
    vol_status: 0,
    updated_at: UPDATED,
    subject: subject(),
    ...extra,
  };
}

function respond(data: unknown[]) {
  fetchMock.mockImplementation(async (url: unknown) =>
    String(url).endsWith("/v0/me")
      ? jsonRes({ username: "someone" })
      : jsonRes({ data }),
  );
}

describe("BangumiService collection mapping", () => {
  let h: ReturnType<typeof createListProviderHarness<BangumiService>>;

  beforeEach(() => {
    fetchMock.mockReset();
    h = createListProviderHarness(BangumiService);
  });

  describe("anime (subject_type 2)", () => {
    const run = async (...data: unknown[]) => {
      respond(data);
      return h.service.syncList("u-1", "watch");
    };

    it("maps a rated done collection", async () => {
      const result = await run(
        collection(DONE, {
          rate: 8,
          ep_status: 12,
          subject: subject(11, {
            name_cn: "中文",
            date: "2021-07-01",
            eps: 12,
            images: { large: "L", medium: "M", common: "C" },
          }),
        }),
      );

      expect(result.accepted).toBe(1);
      expect(h.catalog.upsertTitle).toHaveBeenCalledWith({
        type: "show",
        name: "中文",
        year: 2021,
        bangumiId: 11,
        posterUrl: "L",
      });
      expect(h.catalog.recordWatch).toHaveBeenCalledWith({
        userId: "u-1",
        titleId: "title-1",
        watchedAt: new Date(UPDATED),
        source: "bangumi",
        dedupeKey: "bangumi:list:11:collect:12",
        action: "import",
        progress: 100,
        rating: 8,
        precision: "unknown",
      });
      expect(h.catalog.upsertListState).toHaveBeenCalledWith({
        userId: "u-1",
        titleId: "title-1",
        listType: "rating",
        source: "bangumi",
        rating: 8,
        listedAt: new Date(UPDATED),
      });
      expect(h.enrichment.enqueueTitle).toHaveBeenCalledWith("title-1");
    });

    it.each([
      [WISH, 0, false, 0],
      [DONE, 0, true, 100],
      [DOING, 3, true, 25],
      [ON_HOLD, 0, false, 0],
      [ON_HOLD, 6, true, 50],
      [DROPPED, 0, false, 0],
      [DROPPED, 3, true, 25],
    ])(
      "type %i with %i episodes records=%s at %i%%",
      async (type, ep_status, records, progress) => {
        const result = await run(
          collection(type, { ep_status, subject: subject(11, { eps: 12 }) }),
        );
        expect(result.accepted).toBe(records ? 1 : 0);
        expect(h.catalog.recordWatch).toHaveBeenCalledTimes(records ? 1 : 0);
        if (records) {
          expect(h.catalog.recordWatch.mock.calls[0]?.[0].progress).toBe(progress);
        }
      },
    );

    it.each([
      [WISH, false],
      [DONE, false],
      [DOING, false],
      [ON_HOLD, false],
      [DROPPED, true],
    ])("type %i syncs dropped=%s", async (type, dropped) => {
      await run(collection(type));
      expect(h.catalog.syncDroppedListState).toHaveBeenCalledWith({
        userId: "u-1",
        titleId: "title-1",
        source: "bangumi",
        dropped,
        listedAt: new Date(UPDATED),
      });
    });

    it("gives two subjects with the same status distinct dedupe keys", async () => {
      await run(
        collection(DOING, { ep_status: 5, subject: subject(11) }),
        collection(DOING, { ep_status: 5, subject: subject(22) }),
      );
      const keys = h.catalog.recordWatch.mock.calls.map((c) => c[0].dedupeKey);
      expect(keys).toEqual(["bangumi:list:11:do:5", "bangumi:list:22:do:5"]);
    });

    it("keeps the dedupe key stable across syncs and changes it with progress", async () => {
      const key = async (ep_status: number) => {
        h.catalog.recordWatch.mockClear();
        await run(collection(DOING, { ep_status }));
        return h.catalog.recordWatch.mock.calls[0]?.[0].dedupeKey;
      };
      expect(await key(3)).toBe(await key(3));
      expect(await key(3)).not.toBe(await key(4));
    });

    it("falls back through name and image variants", async () => {
      await run(
        collection(DOING, {
          subject: subject(11, { name_cn: "", images: { common: "C" } }),
        }),
      );
      const title = h.catalog.upsertTitle.mock.calls[0]?.[0];
      expect(title.name).toBe("JP 11");
      expect(title.posterUrl).toBe("C");
    });

    it("nulls an absent poster and unparsable date", async () => {
      await run(
        collection(DOING, { subject: subject(11, { date: "unknown" }) }),
      );
      const title = h.catalog.upsertTitle.mock.calls[0]?.[0];
      expect(title.year).toBeNull();
      expect(title.posterUrl).toBeNull();
    });

    it("treats a zero rate as unrated", async () => {
      await run(collection(DOING));
      expect(h.catalog.recordWatch.mock.calls[0]?.[0].rating).toBeNull();
      expect(h.catalog.upsertListState).not.toHaveBeenCalled();
    });

    it.each([[0], [6], ["do"], [null], [undefined]])(
      "skips an unknown collection type %j and keeps syncing",
      async (type) => {
        const result = await run(collection(type), collection(DONE));
        expect(result.accepted).toBe(1);
        expect(h.catalog.upsertTitle).toHaveBeenCalledTimes(1);
      },
    );

    it("writes every row under the resolved user", async () => {
      h.users.resolveUser.mockResolvedValue({ id: "resolved" });
      await run(collection(DONE, { rate: 5 }));
      expect(h.catalog.recordWatch.mock.calls[0]?.[0].userId).toBe("resolved");
      expect(h.catalog.upsertListState.mock.calls[0]?.[0].userId).toBe("resolved");
      expect(h.catalog.syncDroppedListState.mock.calls[0]?.[0].userId).toBe(
        "resolved",
      );
    });
  });

  describe("manga (subject_type 1)", () => {
    const run = async (...data: unknown[]) => {
      respond(data);
      return h.service.syncList("u-1", "read");
    };

    it("maps list state and progress for a doing collection", async () => {
      const result = await run(
        collection(DOING, {
          rate: 7,
          vol_status: 2,
          subject: subject(21, {
            name_cn: "漫画",
            date: "2018-02-01",
            volumes: 8,
            images: { medium: "M" },
          }),
        }),
      );

      expect(result).toMatchObject({ accepted: 0, mangaAccepted: 1 });
      expect(h.readCatalog.upsertTitle).toHaveBeenCalledWith({
        format: "manga",
        name: "漫画",
        year: 2018,
        volumes: 8,
        bangumiId: 21,
        coverUrl: "M",
      });
      expect(h.readCatalog.upsertListState).toHaveBeenCalledWith({
        userId: "u-1",
        readTitleId: "read-1",
        listStatus: "reading",
        source: "bangumi",
        score: 7,
        progressChapters: 0,
        progressVolumes: 2,
        listedAt: new Date(UPDATED),
      });
      expect(h.readCatalog.recordProgress).toHaveBeenCalledWith({
        userId: "u-1",
        readTitleId: "read-1",
        readAt: new Date(UPDATED),
        source: "bangumi",
        dedupeKey: "bangumi:manga:21:do:2",
        action: "import",
        status: "do",
        volumesRead: 2,
        progress: 25,
        rating: 7,
        precision: "unknown",
        chaptersDelta: 0,
      });
    });

    it.each([
      [WISH, "planning"],
      [DONE, "completed"],
      [DOING, "reading"],
      [ON_HOLD, "paused"],
      [DROPPED, "dropped"],
    ])("type %i maps to list status %s", async (type, listStatus) => {
      await run(collection(type));
      expect(h.readCatalog.upsertListState.mock.calls[0]?.[0].listStatus).toBe(
        listStatus,
      );
    });

    it("counts a wished collection without recording progress", async () => {
      const result = await run(collection(WISH, { vol_status: 2 }));
      expect(result.mangaAccepted).toBe(1);
      expect(h.readCatalog.recordProgress).not.toHaveBeenCalled();
    });

    it("keeps list state but no progress for an idle paused collection", async () => {
      const result = await run(collection(ON_HOLD));
      expect(result.mangaAccepted).toBe(0);
      expect(h.readCatalog.recordProgress).not.toHaveBeenCalled();
    });

    it("records a done collection at 100% with null volumes", async () => {
      await run(collection(DONE));
      const progress = h.readCatalog.recordProgress.mock.calls[0]?.[0];
      expect(progress.progress).toBe(100);
      expect(progress.volumesRead).toBeNull();
      expect(progress.status).toBe("collect");
    });

    it("skips an unknown collection type without writing list state", async () => {
      const result = await run(collection(9));
      expect(result.mangaAccepted).toBe(0);
      expect(h.readCatalog.upsertTitle).not.toHaveBeenCalled();
      expect(h.readCatalog.upsertListState).not.toHaveBeenCalled();
    });
  });
});
