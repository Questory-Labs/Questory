import { describe, expect, it, vi } from "vitest";
import { ConnectionsService } from "../../src/users/connections.service";

describe("ConnectionsService.overview", () => {
  it("leaves public API keys out of the connections list", async () => {
    const apiKeyFindMany = vi.fn().mockResolvedValue([]);
    const prisma = {
      account: { findMany: vi.fn().mockResolvedValue([]) },
      sourceConnection: { findMany: vi.fn().mockResolvedValue([]) },
      apiKey: { findMany: apiKeyFindMany },
      qmonitorDeviceSession: { count: vi.fn().mockResolvedValue(0) },
      user: { findUnique: vi.fn().mockResolvedValue({ lastSyncedAt: null }) },
    };
    await new ConnectionsService(prisma as never).overview("u1");
    expect(apiKeyFindMany.mock.calls[0][0].where).toEqual({
      userId: "u1",
      revokedAt: null,
      type: { not: "public" },
    });
  });
});
