import { afterEach, describe, expect, it, vi } from "vitest";
import { unlink } from "fs/promises";
import { ProfileExportBuildService } from "../../src/profile-data/profile-export-build.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { AccountsService } from "../../src/accounts/accounts.service";

vi.mock("fs/promises", async () => {
  const actual = await vi.importActual<typeof import("fs/promises")>("fs/promises");
  return {
    ...actual,
    unlink: vi.fn().mockResolvedValue(undefined),
  };
});

describe("ProfileExportBuildService.deleteStoredFile", () => {
  afterEach(() => {
    vi.mocked(unlink).mockReset().mockResolvedValue(undefined);
  });

  const service = new ProfileExportBuildService(
    {} as PrismaService,
    {} as AccountsService,
  );

  it("ignores missing files", async () => {
    vi.mocked(unlink).mockRejectedValueOnce(
      Object.assign(new Error("gone"), { code: "ENOENT" }),
    );
    await expect(service.deleteStoredFile("missing.zip")).resolves.toBeUndefined();
  });

  it("propagates other unlink failures", async () => {
    const error = vi
      .spyOn(service["logger"], "error")
      .mockImplementation(() => undefined);
    vi.mocked(unlink).mockRejectedValueOnce(
      Object.assign(new Error("busy"), { code: "EACCES" }),
    );
    await expect(service.deleteStoredFile("busy.zip")).rejects.toThrow("busy");
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("busy.zip"),
    );
    error.mockRestore();
  });
});
