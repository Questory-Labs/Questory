import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictException } from "@nestjs/common";
import { rm } from "fs/promises";
import { ProfileImportService } from "../../src/profile-data/profile-import.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { ProfileImportGamesService } from "../../src/profile-data/profile-import-games.service";
import type { ProfileImportMediaService } from "../../src/profile-data/profile-import-media.service";

vi.mock("fs/promises", async () => {
  const actual = await vi.importActual<typeof import("fs/promises")>("fs/promises");
  return {
    ...actual,
    rm: vi.fn().mockResolvedValue(undefined),
  };
});

describe("ProfileImportService", () => {
  const findFirst = vi.fn();
  const create = vi.fn();
  const executeRaw = vi.fn();

  let service: ProfileImportService;

  beforeEach(() => {
    findFirst.mockReset();
    create.mockReset();
    executeRaw.mockReset().mockResolvedValue(0);
    vi.mocked(rm).mockReset().mockResolvedValue(undefined);

    const prisma = {
      importJob: { findFirst, create, update: vi.fn(), updateMany: vi.fn() },
      $executeRaw: executeRaw,
    } as unknown as PrismaService;

    service = new ProfileImportService(
      prisma,
      {} as ProfileImportGamesService,
      {} as ProfileImportMediaService,
    );
  });

  it("removes the upload before conflicting with an active import", async () => {
    findFirst.mockResolvedValue({ id: "running" });
    await expect(
      service.startImport("user-1", "/tmp/upload.zip", "upload.zip"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(rm).toHaveBeenCalledWith("/tmp/upload.zip", { force: true });
    expect(create).not.toHaveBeenCalled();
  });

  it("translates a unique-constraint create failure into a conflict", async () => {
    findFirst.mockResolvedValue(null);
    create.mockRejectedValue({ code: "P2002" });
    await expect(
      service.startImport("user-1", "/tmp/upload.zip", "upload.zip"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(rm).toHaveBeenCalledWith("/tmp/upload.zip", { force: true });
  });
});
