import { describe, expect, it, vi } from "vitest";
import {
  currentBangumiKey,
  isWebhookMusic,
  readWebhookPayload,
  SourceDataRepairService,
} from "../../src/admin/migrations/source-data-repair.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { CatalogService } from "../../src/watch/catalog/catalog.service";

type Row = Record<string, unknown> & { id: string };

function pagedFindMany(rows: Row[]) {
  return vi.fn(async ({ where }: { where: { id: { gt: string } } }) =>
    rows.filter((row) => row.id > where.id.gt),
  );
}

function build(opts: {
  watchRows?: Row[];
  readRows?: Row[];
  taken?: boolean;
  eventGroups?: unknown[];
  bucketGroups?: unknown[];
}) {
  const watchEvent = {
    findMany: pagedFindMany(opts.watchRows ?? []),
    findUnique: vi.fn().mockResolvedValue(opts.taken ? { id: "other" } : null),
    update: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    groupBy: vi.fn().mockResolvedValue(opts.eventGroups ?? []),
  };
  const readEvent = {
    findMany: pagedFindMany(opts.readRows ?? []),
    findUnique: vi.fn().mockResolvedValue(opts.taken ? { id: "other" } : null),
    update: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
  };
  const watchHourBucket = {
    groupBy: vi.fn().mockResolvedValue(opts.bucketGroups ?? []),
  };
  const catalog = { rebuildWatchHourBuckets: vi.fn().mockResolvedValue(undefined) };
  const service = new SourceDataRepairService(
    { watchEvent, readEvent, watchHourBucket } as unknown as PrismaService,
    catalog as unknown as CatalogService,
  );
  return { service, watchEvent, readEvent, catalog };
}

const legacyWatch = {
  id: "w1",
  userId: "u1",
  dedupeKey: "bangumi:list:undefined:2:12",
  title: { bangumiId: 77 },
};
const legacyRead = {
  id: "r1",
  userId: "u1",
  dedupeKey: "bangumi:manga:undefined:3:4",
  readTitle: { bangumiId: 88 },
};

describe("currentBangumiKey", () => {
  it("maps a legacy key to the subject key", () => {
    expect(currentBangumiKey("bangumi:list:undefined:2:12", 77)).toEqual({
      key: "bangumi:list:77:collect:12",
      status: "collect",
    });
    expect(currentBangumiKey("bangumi:manga:undefined:3:4", 88)).toEqual({
      key: "bangumi:manga:88:do:4",
      status: "do",
    });
  });

  it.each([
    ["bangumi:list:undefined:2:12", null],
    ["bangumi:list:undefined:9:12", 77],
    ["bangumi:list:undefined:undefined:12", 77],
    ["bangumi:list:5:collect:12", 77],
  ])("leaves %s unresolved with subject %s", (key, id) => {
    expect(currentBangumiKey(key, id)).toBeNull();
  });
});

describe("repairBangumiKeys", () => {
  it("writes nothing on a preview", async () => {
    const h = build({ watchRows: [legacyWatch], readRows: [legacyRead] });
    const result = await h.service.repairBangumiKeys(false);
    expect(result).toMatchObject({
      applied: false,
      watch: { scanned: 1, rekeyed: 1, duplicatesDeleted: 0 },
      read: { scanned: 1, rekeyed: 1, duplicatesDeleted: 0 },
    });
    expect(h.watchEvent.update).not.toHaveBeenCalled();
    expect(h.readEvent.update).not.toHaveBeenCalled();
    expect(h.catalog.rebuildWatchHourBuckets).not.toHaveBeenCalled();
  });

  it("rekeys when the new key is free and sets the read status", async () => {
    const h = build({ watchRows: [legacyWatch], readRows: [legacyRead] });
    await h.service.repairBangumiKeys(true);
    expect(h.watchEvent.update).toHaveBeenCalledWith({
      where: { id: "w1" },
      data: { dedupeKey: "bangumi:list:77:collect:12" },
    });
    expect(h.readEvent.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { dedupeKey: "bangumi:manga:88:do:4", status: "do" },
    });
    expect(h.catalog.rebuildWatchHourBuckets).not.toHaveBeenCalled();
  });

  it("deletes a legacy row the new key already covers and rebuilds buckets", async () => {
    const h = build({ watchRows: [legacyWatch], readRows: [legacyRead], taken: true });
    await h.service.repairBangumiKeys(true);
    expect(h.watchEvent.deleteMany).toHaveBeenCalledWith({ where: { id: "w1" } });
    expect(h.readEvent.deleteMany).toHaveBeenCalledWith({ where: { id: "r1" } });
    expect(h.watchEvent.update).not.toHaveBeenCalled();
    expect(h.catalog.rebuildWatchHourBuckets).toHaveBeenCalledWith("u1");
  });

  it("keeps rows it cannot resolve", async () => {
    const h = build({ watchRows: [{ ...legacyWatch, title: { bangumiId: null } }] });
    const result = await h.service.repairBangumiKeys(true);
    expect(result.watch.unresolved).toBe(1);
    expect(h.watchEvent.update).not.toHaveBeenCalled();
    expect(h.watchEvent.deleteMany).not.toHaveBeenCalled();
  });

  it("pages past a full batch", async () => {
    const rows = Array.from({ length: 501 }, (_, i) => ({
      ...legacyWatch,
      id: `w${String(i).padStart(4, "0")}`,
    }));
    const h = build({});
    h.watchEvent.findMany
      .mockResolvedValueOnce(rows.slice(0, 500))
      .mockResolvedValueOnce(rows.slice(500));
    const result = await h.service.repairBangumiKeys(false);
    expect(result.watch.scanned).toBe(501);
    expect(h.watchEvent.findMany.mock.calls[1][0].where.id.gt).toBe("w0499");
  });
});

describe("readWebhookPayload", () => {
  it("reads a parsed Plex track", () => {
    const info = readWebhookPayload("plex", JSON.stringify({ Metadata: { type: "track" } }));
    expect(isWebhookMusic("plex", info)).toBe(true);
  });

  it("reads a truncated Plex payload", () => {
    const raw = '{"event":"media.scrobble","Metadata":{"librarySectionType":"artist","type":"track","title":"So';
    expect(isWebhookMusic("plex", readWebhookPayload("plex", raw))).toBe(true);
  });

  it("does not treat a Plex episode as music despite the section type", () => {
    const raw = '{"Metadata":{"librarySectionType":"artist","type":"episode","title":"So';
    expect(isWebhookMusic("plex", readWebhookPayload("plex", raw))).toBe(false);
  });

  it("reads Jellyfin Audio from Item and from the top level", () => {
    expect(
      isWebhookMusic(
        "jellyfin",
        readWebhookPayload("jellyfin", JSON.stringify({ Item: { Type: "Audio" } })),
      ),
    ).toBe(true);
    expect(
      isWebhookMusic(
        "jellyfin",
        readWebhookPayload("jellyfin", JSON.stringify({ ItemType: "MusicAlbum" })),
      ),
    ).toBe(true);
  });

  it("does not read a nested stream type from a truncated Jellyfin movie", () => {
    const raw = '{"Item":{"Name":"Film","MediaStreams":[{"Type":"Audio","Codec":"aac"},{"Type":"Vid';
    expect(isWebhookMusic("jellyfin", readWebhookPayload("jellyfin", raw))).toBe(false);
  });

  it("reads ItemType from a truncated Jellyfin template payload", () => {
    const raw = '{"NotificationType":"PlaybackStop","ItemType":"Audio","Name":"So';
    expect(isWebhookMusic("jellyfin", readWebhookPayload("jellyfin", raw))).toBe(true);
  });

  it.each([null, "", "not json", "[]", "null"])("treats %s as unknown", (raw) => {
    expect(isWebhookMusic("plex", readWebhookPayload("plex", raw))).toBe(false);
    expect(isWebhookMusic("jellyfin", readWebhookPayload("jellyfin", raw))).toBe(false);
  });
});

describe("repairWebhookMusic", () => {
  const rows = [
    { id: "a", userId: "u1", source: "plex", rawPayload: JSON.stringify({ Metadata: { type: "track" } }) },
    { id: "b", userId: "u2", source: "plex", rawPayload: JSON.stringify({ Metadata: { type: "movie" } }) },
    { id: "c", userId: "u3", source: "jellyfin", rawPayload: JSON.stringify({ NotificationType: "PlaybackStart", ItemType: "Episode" }) },
    { id: "d", userId: "u3", source: "jellyfin", rawPayload: JSON.stringify({ NotificationType: "PlaybackStop", PlayedToCompletion: true, ItemType: "Movie" }) },
    { id: "e", userId: "u3", source: "jellyfin", rawPayload: null },
  ];

  it("counts on a preview without deleting", async () => {
    const h = build({ watchRows: rows });
    await expect(h.service.repairWebhookMusic(false)).resolves.toEqual({
      applied: false,
      scanned: 5,
      musicDeleted: 1,
      jellyfinConfirmedWatches: 1,
      jellyfinUnconfirmedKept: 2,
    });
    expect(h.watchEvent.deleteMany).not.toHaveBeenCalled();
    expect(h.catalog.rebuildWatchHourBuckets).not.toHaveBeenCalled();
  });

  it("deletes only music and rebuilds only that user", async () => {
    const h = build({ watchRows: rows });
    await h.service.repairWebhookMusic(true);
    expect(h.watchEvent.deleteMany).toHaveBeenCalledOnce();
    expect(h.watchEvent.deleteMany).toHaveBeenCalledWith({ where: { id: "a" } });
    expect(h.catalog.rebuildWatchHourBuckets.mock.calls).toEqual([["u1"]]);
  });
});

describe("rebuildWatchBuckets", () => {
  const groups = {
    eventGroups: [
      { userId: "u1", _count: { _all: 3 } },
      { userId: "u2", _count: { _all: 2 } },
    ],
    bucketGroups: [
      { userId: "u1", _sum: { watchCount: 9 } },
      { userId: "u2", _sum: { watchCount: 2 } },
      { userId: "u3", _sum: { watchCount: 4 } },
    ],
  };

  it("reports mismatches on a preview without rebuilding", async () => {
    const h = build(groups);
    await expect(h.service.rebuildWatchBuckets(false)).resolves.toEqual({
      applied: false,
      users: 3,
      mismatchedUsers: 2,
      eventCount: 5,
      bucketWatchCount: 15,
    });
    expect(h.catalog.rebuildWatchHourBuckets).not.toHaveBeenCalled();
  });

  it("rebuilds every user when applied", async () => {
    const h = build(groups);
    await h.service.rebuildWatchBuckets(true);
    expect(h.catalog.rebuildWatchHourBuckets.mock.calls.flat().sort()).toEqual(["u1", "u2", "u3"]);
  });
});
