import { ForbiddenException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiKeysService } from "../../src/api-keys/api-keys.service";

describe("ApiKeysService music_ingest mutex", () => {
  const findUnique = vi.fn();
  const hasNative = vi.fn();
  let service: ApiKeysService;

  beforeEach(() => {
    findUnique.mockReset();
    hasNative.mockReset();
    findUnique.mockResolvedValue({ id: "u1", personaName: "Santosh" });
    service = new ApiKeysService(
      { user: { findUnique } } as never,
      { ensureListenbrainzAccount: vi.fn() } as never,
      { hasNative } as never,
    );
  });

  it("rejects minting a music_ingest key while native scrobbling is on", async () => {
    hasNative.mockResolvedValue(true);
    await expect(
      service.create("u1", { type: "music_ingest" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows minting when native scrobbling is off", async () => {
    hasNative.mockResolvedValue(false);
    const prisma = {
      user: { findUnique },
      apiKey: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockResolvedValue({
          id: "k1",
          type: "music_ingest",
          tokenPrefix: "abcd",
          label: null,
          createdAt: new Date(),
        }),
      },
    };
    service = new ApiKeysService(
      prisma as never,
      {
        ensureListenbrainzAccount: vi.fn(),
        getListenbrainzUsername: vi.fn().mockResolvedValue("santosh"),
      } as never,
      { hasNative } as never,
    );
    const created = await service.create("u1", { type: "music_ingest" });
    expect(created.token).toEqual(expect.any(String));
    expect(created.listenbrainzUsername).toBe("santosh");
  });
});
