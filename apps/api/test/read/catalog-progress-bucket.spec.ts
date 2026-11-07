import { describe, expect, it, vi } from "vitest";
import {
  ReadCatalogService,
  type RecordReadProgressInput,
} from "../../src/read/catalog/catalog.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

const READ_AT = new Date("2026-01-01T10:30:00Z");

function input(overrides: Partial<RecordReadProgressInput> = {}): RecordReadProgressInput {
  return {
    userId: "u-1",
    readTitleId: "r-1",
    readAt: READ_AT,
    source: "anilist",
    dedupeKey: "k-1",
    ...overrides,
  };
}

function build(opts: { existing?: boolean; priorMax?: number | null } = {}) {
  const readEvent = {
    findUnique: vi.fn().mockResolvedValue(opts.existing ? { id: "e-1" } : null),
    aggregate: vi.fn().mockResolvedValue({ _max: { chaptersRead: opts.priorMax ?? null } }),
    upsert: vi.fn().mockResolvedValue({ id: "e-1" }),
  };
  const readHourBucket = { upsert: vi.fn().mockResolvedValue({}) };
  const service = new ReadCatalogService({ readEvent, readHourBucket } as unknown as PrismaService);
  return { service, readEvent, readHourBucket };
}

describe("ReadCatalogService.recordProgress hour bucket", () => {
  it("bumps once for a new event", async () => {
    const { service, readHourBucket } = build();
    await service.recordProgress(input({ chaptersDelta: 3 }));
    expect(readHourBucket.upsert).toHaveBeenCalledOnce();
    expect(readHourBucket.upsert.mock.calls[0][0].create).toMatchObject({
      userId: "u-1",
      eventCount: 1,
      chaptersDelta: 3,
    });
  });

  it("does not bump when the dedupe key was already recorded", async () => {
    const { service, readEvent, readHourBucket } = build({ existing: true });
    await expect(service.recordProgress(input({ chaptersDelta: 3 }))).resolves.toEqual({
      id: "e-1",
    });
    expect(readEvent.upsert).toHaveBeenCalledOnce();
    expect(readHourBucket.upsert).not.toHaveBeenCalled();
  });

  it("looks up the existing event by the same user and dedupe key", async () => {
    const { service, readEvent } = build();
    await service.recordProgress(input());
    expect(readEvent.findUnique.mock.calls[0][0].where).toEqual({
      userId_dedupeKey: { userId: "u-1", dedupeKey: "k-1" },
    });
  });

  it("does not inflate across repeated syncs of an unchanged entry", async () => {
    const { service, readEvent, readHourBucket } = build();
    await service.recordProgress(input({ chaptersTotal: 10 }));
    readEvent.findUnique.mockResolvedValue({ id: "e-1" });
    await service.recordProgress(input({ chaptersTotal: 10 }));
    await service.recordProgress(input({ chaptersTotal: 10 }));
    expect(readHourBucket.upsert).toHaveBeenCalledOnce();
  });

  it.each([
    ["first import counts everything", 10, null, 10],
    ["later progress counts only the gain", 12, 10, 2],
    ["a status change at the same progress counts nothing", 12, 12, 0],
    ["a rewatch below the prior maximum counts nothing", 3, 12, 0],
    ["zero stays zero", 0, null, 0],
  ])("%s", async (_label, chaptersTotal, priorMax, expected) => {
    const { service, readEvent, readHourBucket } = build({ priorMax });
    await service.recordProgress(input({ chaptersTotal }));
    expect(readEvent.aggregate).toHaveBeenCalledWith({
      where: { userId: "u-1", readTitleId: "r-1", source: "anilist" },
      _max: { chaptersRead: true },
    });
    expect(readHourBucket.upsert.mock.calls[0][0].create.chaptersDelta).toBe(expected);
  });

  it("reads the prior maximum before writing the new event", async () => {
    const { service, readEvent } = build({ priorMax: 1 });
    await service.recordProgress(input({ chaptersTotal: 2 }));
    expect(readEvent.aggregate.mock.invocationCallOrder[0]).toBeLessThan(
      readEvent.upsert.mock.invocationCallOrder[0],
    );
  });

  it("uses a caller-supplied delta without querying when no total is given", async () => {
    const { service, readEvent, readHourBucket } = build();
    await service.recordProgress(input({ chaptersDelta: 1 }));
    expect(readEvent.aggregate).not.toHaveBeenCalled();
    expect(readHourBucket.upsert.mock.calls[0][0].update.chaptersDelta).toEqual({
      increment: 1,
    });
  });

  it("still counts an event when neither is given", async () => {
    const { service, readHourBucket } = build();
    await service.recordProgress(input());
    expect(readHourBucket.upsert.mock.calls[0][0].create).toMatchObject({
      eventCount: 1,
      chaptersDelta: 0,
    });
  });

  it("does not query the prior maximum for a repeated event", async () => {
    const { service, readEvent } = build({ existing: true });
    await service.recordProgress(input({ chaptersTotal: 5 }));
    expect(readEvent.aggregate).not.toHaveBeenCalled();
  });
});
