import { describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { CollectionsService } from "../../src/collections/collections.service";

describe("collections IDOR", () => {
  it("getOne scopes by userId", async () => {
    const prisma = {
      collection: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as any;
    const service = new CollectionsService(prisma);
    await expect(service.getOne("user-a", "col-b")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.collection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "col-b", userId: "user-a" },
      }),
    );
  });

  it("removeCustom refuses other user collection", async () => {
    const prisma = {
      collection: {
        findFirst: vi.fn().mockResolvedValue(null),
        delete: vi.fn(),
      },
    } as any;
    const service = new CollectionsService(prisma);
    await expect(
      service.removeCustom("user-a", "col-owned-by-b"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.collection.delete).not.toHaveBeenCalled();
  });
});
