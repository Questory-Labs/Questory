import { describe, expect, it, vi } from "vitest";
import { CatalogService } from "../../src/watch/catalog/catalog.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

const input = {
  userId: "u-1",
  titleId: "t-1",
  watchedAt: new Date("2026-01-01T10:30:00Z"),
  source: "trakt",
  dedupeKey: "k-1",
  runtimeMinutes: 45,
};

function build(existing: boolean) {
  const watchEvent = {
    findUnique: vi.fn().mockResolvedValue(existing ? { id: "e-1" } : null),
    upsert: vi.fn().mockResolvedValue({ id: "e-1" }),
  };
  const watchHourBucket = { upsert: vi.fn().mockResolvedValue({}) };
  const title = { findUnique: vi.fn().mockResolvedValue({ runtimeMinutes: 90 }) };
  const service = new CatalogService({
    watchEvent,
    watchHourBucket,
    title,
  } as unknown as PrismaService);
  return { service, watchEvent, watchHourBucket, title };
}

describe("CatalogService.recordWatch hour bucket", () => {
  it("bumps once for a new event", async () => {
    const { service, watchHourBucket } = build(false);
    await service.recordWatch(input);
    expect(watchHourBucket.upsert).toHaveBeenCalledOnce();
    expect(watchHourBucket.upsert.mock.calls[0][0].create).toMatchObject({
      watchCount: 1,
      minutesWatched: 45,
    });
  });

  it("does not bump when the dedupe key already exists", async () => {
    const { service, watchEvent, watchHourBucket } = build(true);
    await expect(service.recordWatch(input)).resolves.toEqual({ id: "e-1" });
    expect(watchEvent.upsert).toHaveBeenCalledOnce();
    expect(watchHourBucket.upsert).not.toHaveBeenCalled();
  });

  it("falls back to the title runtime for a new event", async () => {
    const { service, watchHourBucket } = build(false);
    await service.recordWatch({ ...input, runtimeMinutes: undefined });
    expect(watchHourBucket.upsert.mock.calls[0][0].create.minutesWatched).toBe(90);
  });
});

describe("CatalogService.upsertTitle typeFromProvider", () => {
  const existing = {
    id: "t-1",
    type: "show",
    name: "Film",
    nameNormalized: "film",
    malId: 5,
    tmdbId: null,
    traktId: null,
    imageManual: false,
  };

  function buildTitle(found: Record<string, unknown>) {
    const title = {
      findFirst: vi.fn().mockResolvedValue(found),
      update: vi.fn().mockResolvedValue(found),
    };
    return { title, service: new CatalogService({ title } as unknown as PrismaService) };
  }

  it("corrects a show row found by malId", async () => {
    const h = buildTitle(existing);
    await h.service.upsertTitle({ type: "movie", name: "Film", malId: 5, typeFromProvider: true });
    expect(h.title.update.mock.calls[0][0].data.type).toBe("movie");
  });

  it("leaves the type alone without the flag", async () => {
    const h = buildTitle(existing);
    await h.service.upsertTitle({ type: "movie", name: "Film", malId: 5 });
    expect(h.title.update.mock.calls[0][0].data).not.toHaveProperty("type");
  });

  it.each([{ tmdbId: 9 }, { traktId: 9 }])("leaves a row with %o alone", async (ids) => {
    const h = buildTitle({ ...existing, ...ids });
    await h.service.upsertTitle({ type: "movie", name: "Film", malId: 5, typeFromProvider: true });
    expect(h.title.update.mock.calls[0][0].data).not.toHaveProperty("type");
  });
});
