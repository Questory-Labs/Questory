import { describe, expect, it, vi } from "vitest";
import { CatalogService } from "../../src/watch/catalog/catalog.service";

function setup() {
  const titleListState = {
    upsert: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
  };
  const service = new CatalogService({ titleListState } as never);
  return { service, titleListState };
}

const key = {
  userId: "u1",
  titleId: "t1",
  listType: "dropped",
  source: "mal",
};

describe("CatalogService.syncDroppedListState", () => {
  it("keeps the first drop date on later syncs", async () => {
    const { service, titleListState } = setup();
    const listedAt = new Date("2026-10-01T00:00:00Z");
    await service.syncDroppedListState({
      userId: "u1",
      titleId: "t1",
      source: "mal",
      dropped: true,
      listedAt,
    });
    expect(titleListState.upsert).toHaveBeenCalledWith({
      where: { userId_titleId_listType_source: key },
      create: { ...key, listedAt },
      update: {},
    });
  });

  it("clears the dropped row when the provider status changes", async () => {
    const { service, titleListState } = setup();
    await service.syncDroppedListState({
      userId: "u1",
      titleId: "t1",
      source: "mal",
      dropped: false,
    });
    expect(titleListState.deleteMany).toHaveBeenCalledWith({ where: key });
    expect(titleListState.upsert).not.toHaveBeenCalled();
  });
});
