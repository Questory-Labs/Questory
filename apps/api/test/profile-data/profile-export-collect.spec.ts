import { describe, expect, it, vi } from "vitest";
import { collectServices } from "../../src/profile-data/profile-export-collect";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { AccountsService } from "../../src/accounts/accounts.service";

describe("collectServices", () => {
  it("reads only provider names, never token columns", async () => {
    const listForUser = vi.fn().mockResolvedValue([
      { provider: "steam" },
    ]);
    const sourceFindMany = vi.fn().mockResolvedValue([{ provider: "trakt" }]);
    const storeFindMany = vi.fn().mockResolvedValue([{ store: "gog" }]);
    const prisma = {
      sourceConnection: { findMany: sourceFindMany },
      storeAccount: { findMany: storeFindMany },
    } as unknown as PrismaService;
    const accounts = { listForUser } as unknown as AccountsService;

    const result = await collectServices(prisma, accounts, "u1");

    expect(sourceFindMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
      select: { provider: true },
    });
    expect(storeFindMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
      select: { store: true },
    });
    expect(JSON.stringify(result).toLowerCase()).not.toContain("token");
    expect(result).toEqual(["gog", "steam", "trakt"]);
  });
});
