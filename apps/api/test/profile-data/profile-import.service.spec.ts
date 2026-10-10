import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictException } from "@nestjs/common";
import { readFile, rm } from "fs/promises";
import type { QuestoryProfileArchive } from "@questorylabs/shared";
import { ProfileImportService } from "../../src/profile-data/profile-import.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { ProfileImportGamesService } from "../../src/profile-data/profile-import-games.service";
import type { ProfileImportMediaService } from "../../src/profile-data/profile-import-media.service";
import type { ImportProgress } from "../../src/profile-data/profile-import-progress";
import { PROFILE_IMPORT_PROGRESS_FLUSH_MS } from "../../src/profile-data/profile-data.constants";

vi.mock("fs/promises", async () => {
  const actual = await vi.importActual<typeof import("fs/promises")>("fs/promises");
  return {
    ...actual,
    rm: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn(),
  };
});

const archive = {
  format: "questory.profile" as const,
  version: 1 as const,
  exportedAt: "2026-08-29T12:00:00.000Z",
  services: [],
  profile: {},
  library: [],
  wishlistTargets: [],
  purchases: [],
  collections: [],
  playSessions: [],
  playSessionRules: [],
  music: { rules: [], labels: [], listens: [] },
  watch: { events: [], listStates: [] },
  read: { events: [], listStates: [] },
} satisfies QuestoryProfileArchive;

vi.mock("../../src/profile-data/profile-zip", () => ({
  unzipProfileArchiveJson: () => JSON.stringify(archive),
}));

describe("ProfileImportService", () => {
  const findFirst = vi.fn();
  const create = vi.fn();
  const executeRaw = vi.fn();
  const update = vi.fn();
  const updateMany = vi.fn();

  let service: ProfileImportService;

  beforeEach(() => {
    findFirst.mockReset();
    create.mockReset();
    executeRaw.mockReset().mockResolvedValue(0);
    update.mockReset().mockResolvedValue({});
    updateMany.mockReset().mockResolvedValue({ count: 1 });
    vi.mocked(readFile).mockReset().mockResolvedValue(Buffer.from("zip"));
    vi.mocked(rm).mockReset().mockResolvedValue(undefined);

    const prisma = {
      importJob: { findFirst, create, update, updateMany },
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

  it("persists running counts while sections are still importing", async () => {
    vi.useFakeTimers();
    try {
      findFirst.mockResolvedValue(null);
      create.mockResolvedValue({
        id: "job-1",
        source: "questory_profile",
        status: "running",
        fileName: "upload.zip",
        total: 0,
        accepted: 0,
        skipped: 0,
        lastError: null,
        createdAt: new Date(),
        completedAt: null,
      });
      const none = vi.fn().mockResolvedValue({ accepted: 0, skipped: 0 });
      let finishMusic!: () => void;
      const games = {
        applyProfile: vi.fn().mockResolvedValue(undefined),
        applyLibrary: none,
        applyWishlist: none,
        applyPurchases: none,
        applyCollections: none,
        applyPlaySessionRules: none,
        applyPlaySessions: none,
        applyFamily: none,
      } as unknown as ProfileImportGamesService;
      const media = {
        applyMusic: vi.fn(
          (_u: string, _a: unknown, progress: ImportProgress) =>
            new Promise((resolve) => {
              progress.accepted += 3;
              progress.skipped += 1;
              finishMusic = () => resolve({ accepted: 3, skipped: 1 });
            }),
        ),
        applyWatch: none,
        applyRead: none,
      } as unknown as ProfileImportMediaService;
      service = new ProfileImportService(
        {
          importJob: { findFirst, create, update, updateMany },
        } as unknown as PrismaService,
        games,
        media,
      );

      await service.startImport("user-1", "/tmp/upload.zip", "upload.zip");
      await vi.advanceTimersByTimeAsync(PROFILE_IMPORT_PROGRESS_FLUSH_MS);

      expect(updateMany).toHaveBeenCalledWith({
        where: { id: "job-1", status: "running" },
        data: { accepted: 3, skipped: 1 },
      });
      expect(update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "completed" }),
        }),
      );

      finishMusic();
      await vi.advanceTimersByTimeAsync(0);

      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "completed",
            accepted: 3,
            skipped: 1,
          }),
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
