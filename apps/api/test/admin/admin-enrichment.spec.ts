import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { AdminEnrichmentService } from "../../src/admin/admin-enrichment.service";
import { AdminController } from "../../src/admin/admin.controller";
import { REQUEUE_ALL_FAILED_LIMIT } from "../../src/admin/admin.constants";
import type { PrismaService } from "../../src/prisma/prisma.service";

describe("AdminEnrichmentService.requeueFailed", () => {
  const music = { enqueueTrack: vi.fn().mockResolvedValue(undefined) };
  const watch = { enqueueTitle: vi.fn() };
  const enrichmentJob = { findMany: vi.fn(), updateMany: vi.fn() };
  const titleEnrichmentJob = { findMany: vi.fn(), updateMany: vi.fn() };
  let service: AdminEnrichmentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdminEnrichmentService(
      { enrichmentJob, titleEnrichmentJob } as unknown as PrismaService,
      music as never,
      watch as never,
    );
  });

  it("requeues only the newest failed music job per track", async () => {
    enrichmentJob.findMany.mockResolvedValue([
      { id: "j1", trackId: "t1" },
      { id: "j2", trackId: "t1" },
    ]);
    enrichmentJob.updateMany.mockResolvedValue({ count: 1 });
    const result = await service.requeueFailed({ domain: "music", ids: ["j1", "j2"] });
    expect(enrichmentJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "failed", id: { in: ["j1", "j2"] } },
        orderBy: { createdAt: "desc" },
        take: REQUEUE_ALL_FAILED_LIMIT,
      }),
    );
    expect(enrichmentJob.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["j1"] }, status: "failed" },
      data: { status: "pending", lastError: null, completedAt: null },
    });
    expect(music.enqueueTrack).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true, domain: "music", requeued: 1 });
  });

  it("requeues all failed watch jobs with a bound", async () => {
    titleEnrichmentJob.findMany.mockResolvedValue([{ id: "w1", titleId: "x" }]);
    titleEnrichmentJob.updateMany.mockResolvedValue({ count: 1 });
    const result = await service.requeueFailed({ domain: "watch", allFailed: true });
    expect(titleEnrichmentJob.findMany.mock.calls[0][0]).toMatchObject({
      where: { status: "failed" },
      take: REQUEUE_ALL_FAILED_LIMIT,
    });
    expect(watch.enqueueTitle).toHaveBeenCalledWith("x", { force: true });
    expect(result).toEqual({ ok: true, domain: "watch", requeued: 1 });
  });

  it("returns zero without writing when nothing failed", async () => {
    enrichmentJob.findMany.mockResolvedValue([]);
    const result = await service.requeueFailed({ domain: "music", allFailed: true });
    expect(enrichmentJob.updateMany).not.toHaveBeenCalled();
    expect(result.requeued).toBe(0);
  });

  it("rejects a request with neither ids nor allFailed", async () => {
    await expect(service.requeueFailed({ domain: "music" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe("AdminController enrichment/requeue", () => {
  const requeueFailed = vi.fn().mockResolvedValue({ ok: true, domain: "music", requeued: 1 });
  const controller = new AdminController(
    {} as never,
    {} as never,
    {} as never,
    { requeueFailed } as never,
  );

  beforeEach(() => {
    requeueFailed.mockClear();
  });

  it("passes a valid body through", async () => {
    await controller.requeueEnrichment({ domain: "music", ids: ["j1"] });
    expect(requeueFailed).toHaveBeenCalledWith({ domain: "music", ids: ["j1"] });
  });

  it.each([
    { domain: "game", allFailed: true },
    { domain: "music" },
    { domain: "music", ids: ["a"], allFailed: true },
    { domain: "music", ids: [] },
    { domain: "watch", ids: Array.from({ length: 101 }, (_, i) => `id${i}`) },
  ])("rejects invalid body %#", (body) => {
    expect(() => controller.requeueEnrichment(body)).toThrow(BadRequestException);
    expect(requeueFailed).not.toHaveBeenCalled();
  });
});
