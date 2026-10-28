import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { ReadLibraryService } from "../../src/read/library/library.service";
import { ReadLibraryController } from "../../src/read/library/library.controller";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { UsersService } from "../../src/watch/users/users.service";

describe("ReadLibraryService filters", () => {
  const count = vi.fn();
  const findMany = vi.fn();
  const groupBy = vi.fn();
  const genreFind = vi.fn();
  let service: ReadLibraryService;

  beforeEach(() => {
    count.mockReset().mockResolvedValue(0);
    findMany.mockReset().mockResolvedValue([]);
    groupBy.mockReset().mockResolvedValue([
      { listStatus: "reading", _count: { _all: 2 } },
      { listStatus: "completed", _count: { _all: 5 } },
    ]);
    genreFind.mockReset().mockResolvedValue([{ name: "Action" }, { name: "Drama" }]);
    service = new ReadLibraryService(
      {
        readListState: { count, findMany, groupBy },
        genre: { findMany: genreFind },
      } as unknown as PrismaService,
      { resolveUser: vi.fn().mockResolvedValue({ id: "u-1" }) } as unknown as UsersService,
    );
  });

  it("returns status counts ignoring the status filter and genre options", async () => {
    const result = await service.list("u-1", { status: "reading", genre: "Action" });

    expect(result.statusCounts).toEqual([
      { status: "completed", count: 5 },
      { status: "reading", count: 2 },
    ]);
    expect(result.genreOptions).toEqual(["Action", "Drama"]);
    const groupWhere = groupBy.mock.calls[0][0].where;
    expect(groupWhere.listStatus).toBeUndefined();
    expect(groupWhere.readTitle.genres.some.genre.name.equals).toBe("Action");
    expect(findMany.mock.calls[0][0].where.listStatus).toBe("reading");
    expect(genreFind.mock.calls[0][0].take).toBeGreaterThan(0);
  });

  it("orders by the requested sort", async () => {
    await service.list("u-1", { sort: "title" });
    expect(findMany.mock.calls[0][0].orderBy[0]).toEqual({
      readTitle: { name: "asc" },
    });
    await service.list("u-1", { sort: "score" });
    expect(findMany.mock.calls[1][0].orderBy[0]).toEqual({
      score: { sort: "desc", nulls: "last" },
    });
  });
});

describe("ReadLibraryController", () => {
  it("rejects an unknown sort", () => {
    const ctrl = new ReadLibraryController({
      list: vi.fn(),
    } as unknown as ReadLibraryService);
    expect(() =>
      ctrl.list("u-1", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, "random"),
    ).toThrow(BadRequestException);
  });
});
