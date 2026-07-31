import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminService } from "../../src/admin/admin.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

describe("AdminService.listCronRuns", () => {
  const count = vi.fn();
  const findMany = vi.fn();

  let service: AdminService;

  beforeEach(() => {
    count.mockReset().mockResolvedValue(42);
    findMany.mockReset().mockResolvedValue([
      {
        id: "run-1",
        jobName: "daily-refresh",
        status: "completed",
        triggeredBy: "system",
        triggeredByUserId: null,
        startedAt: new Date("2026-01-01T00:00:00.000Z"),
        finishedAt: new Date("2026-01-01T00:01:00.000Z"),
        error: null,
        meta: "{}",
      },
    ]);

    const prisma = {
      cronRun: { count, findMany },
    } as unknown as PrismaService;

    service = new AdminService(
      prisma,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it("returns a paginated slice with total count", async () => {
    const result = await service.listCronRuns({ page: 2, pageSize: 10 });

    expect(count).toHaveBeenCalled();
    expect(findMany).toHaveBeenCalledWith({
      orderBy: { startedAt: "desc" },
      skip: 10,
      take: 10,
    });
    expect(result).toEqual({
      page: 2,
      pageSize: 10,
      total: 42,
      runs: [
        expect.objectContaining({
          id: "run-1",
          jobName: "daily-refresh",
          status: "completed",
          startedAt: "2026-01-01T00:00:00.000Z",
        }),
      ],
    });
  });
});
