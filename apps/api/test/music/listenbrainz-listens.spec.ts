import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListenBrainzService } from "../../src/music/listenbrainz/listenbrainz.service";

describe("ListenBrainzService.getListens", () => {
  const findMany = vi.fn();
  const findByUsername = vi.fn();
  const getListenbrainzUsername = vi.fn();

  let service: ListenBrainzService;

  beforeEach(() => {
    findMany.mockReset();
    findByUsername.mockReset();
    getListenbrainzUsername.mockReset();
    findByUsername.mockResolvedValue({ id: "u1", personaName: "Santosh" });
    getListenbrainzUsername.mockResolvedValue("santosh");
    findMany.mockResolvedValue([]);

    service = new ListenBrainzService(
      { listen: { findMany } } as never,
      {} as never,
      {} as never,
      {} as never,
      {
        findByUsername,
        getListenbrainzUsername,
      } as never,
    );
  });

  it("accepts min_ts and max_ts together (multi-scrobbler range)", async () => {
    await service.getListens("santosh", { minTs: 100, maxTs: 200, count: 10 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "u1",
          listenedAt: {
            gt: new Date(100_000),
            lt: new Date(200_000),
          },
        },
      }),
    );
  });

  it("rejects inverted ranges", async () => {
    await expect(
      service.getListens("santosh", { minTs: 200, maxTs: 100 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(findMany).not.toHaveBeenCalled();
  });
});
