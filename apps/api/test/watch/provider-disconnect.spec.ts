import { describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { disconnectSourceConnection } from "../../src/watch/lib/disconnect";
import { MalController } from "../../src/watch/mal/mal.controller";
import { ReadKitsuController } from "../../src/read/kitsu/kitsu.controller";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { UsersService } from "../../src/watch/users/users.service";
import type { MalService } from "../../src/watch/mal/mal.service";
import type { KitsuService } from "../../src/watch/kitsu/kitsu.service";
import type { FeatureFlagsService } from "../../src/features/feature-flags.service";

function usersFor(user: { id: string } | null) {
  return {
    resolveUser: vi.fn().mockResolvedValue(user),
  } as unknown as UsersService;
}

describe("provider disconnect", () => {
  it("deletes only the caller's connection row", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      sourceConnection: { deleteMany },
    } as unknown as PrismaService;

    const result = await disconnectSourceConnection(
      prisma,
      usersFor({ id: "u-1" }),
      "u-1",
      "mal",
    );

    expect(result).toEqual({ ok: true, disconnected: true });
    expect(deleteMany).toHaveBeenCalledWith({
      where: { userId: "u-1", provider: "mal" },
    });
  });

  it("reports when nothing was connected", async () => {
    const prisma = {
      sourceConnection: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    } as unknown as PrismaService;
    expect(
      await disconnectSourceConnection(
        prisma,
        usersFor({ id: "u-1" }),
        "u-1",
        "trakt",
      ),
    ).toEqual({ ok: true, disconnected: false });
  });

  it("rejects an unknown user", async () => {
    await expect(
      disconnectSourceConnection({} as PrismaService, usersFor(null), "x", "mal"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("routes watch and read DELETE handlers to the service", async () => {
    const malDisconnect = vi
      .fn()
      .mockResolvedValue({ ok: true, disconnected: true });
    const watchCtrl = new MalController(
      { disconnect: malDisconnect } as unknown as MalService,
      {} as FeatureFlagsService,
    );
    await watchCtrl.disconnect("u-1");
    expect(malDisconnect).toHaveBeenCalledWith("u-1");

    const kitsuDisconnect = vi
      .fn()
      .mockResolvedValue({ ok: true, disconnected: false });
    const readCtrl = new ReadKitsuController({
      disconnect: kitsuDisconnect,
    } as unknown as KitsuService);
    await readCtrl.disconnect("u-2");
    expect(kitsuDisconnect).toHaveBeenCalledWith("u-2");
  });
});
