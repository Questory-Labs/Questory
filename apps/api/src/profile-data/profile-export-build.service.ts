import { createWriteStream } from "fs";
import { mkdir, rm, stat, unlink } from "fs/promises";
import { join } from "path";
import { Injectable, Logger } from "@nestjs/common";
import {
  QUESTORY_PROFILE_FORMAT,
  QUESTORY_PROFILE_VERSION,
} from "@questorylabs/shared";
import { AccountsService } from "../accounts/accounts.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  collectCollections,
  collectFamily,
  collectLibrary,
  collectMusicLabels,
  collectMusicRules,
  collectPlaySessionRules,
  collectPlaySessions,
  collectProfile,
  collectPurchases,
  collectReadListStates,
  collectServices,
  collectWatchListStates,
  collectWishlistTargets,
} from "./profile-export-collect";
import {
  collectMusicListens,
  collectReadEvents,
  collectWatchEvents,
} from "./profile-export-history";
import {
  ensureProfileExportDir,
  profileExportZipPath,
} from "./profile-export-dir";
import { profileExportReadme, zipProfileArchiveToPath } from "./profile-zip";
import { PROFILE_EXPORT_TTL_MS } from "./profile-data.constants";

@Injectable()
export class ProfileExportBuildService {
  private readonly logger = new Logger(ProfileExportBuildService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
  ) {}

  async buildZip(userId: string, jobId: string) {
    const dir = await ensureProfileExportDir();
    const staging = join(dir, `.staging-${jobId}`);
    await mkdir(staging, { recursive: true });
    const jsonPath = join(staging, "questory-profile.json");
    const storageKey = `${jobId}.zip`;
    const zipPath = profileExportZipPath(storageKey);

    try {
      const exportedAt = new Date().toISOString();
      const services = await collectServices(
        this.prisma,
        this.accounts,
        userId,
      );
      const archive = {
        format: QUESTORY_PROFILE_FORMAT,
        version: QUESTORY_PROFILE_VERSION,
        exportedAt,
        services,
        profile: await collectProfile(this.prisma, userId),
        library: await collectLibrary(this.prisma, userId),
        wishlistTargets: await collectWishlistTargets(this.prisma, userId),
        purchases: await collectPurchases(this.prisma, userId),
        collections: await collectCollections(this.prisma, userId),
        playSessions: await collectPlaySessions(this.prisma, userId),
        playSessionRules: await collectPlaySessionRules(this.prisma, userId),
        family: await collectFamily(this.prisma, userId),
        music: {
          rules: await collectMusicRules(this.prisma, userId),
          labels: await collectMusicLabels(this.prisma, userId),
          listens: await collectMusicListens(this.prisma, userId),
        },
        watch: {
          events: await collectWatchEvents(this.prisma, userId),
          listStates: await collectWatchListStates(this.prisma, userId),
        },
        read: {
          events: await collectReadEvents(this.prisma, userId),
          listStates: await collectReadListStates(this.prisma, userId),
        },
      };

      await this.writeJsonFile(jsonPath, archive);
      await zipProfileArchiveToPath(
        jsonPath,
        profileExportReadme(exportedAt, services),
        zipPath,
      );
      const info = await stat(zipPath);
      const day = exportedAt.slice(0, 10);
      return {
        storageKey,
        fileName: `questory-profile-${day}.zip`,
        byteSize: info.size,
        expiresAt: new Date(Date.now() + PROFILE_EXPORT_TTL_MS),
      };
    } finally {
      await rm(staging, { recursive: true, force: true }).catch(() => {});
    }
  }

  async deleteStoredFile(storageKey: string | null | undefined) {
    if (!storageKey) return;
    try {
      await unlink(profileExportZipPath(storageKey));
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? (err as NodeJS.ErrnoException).code
          : undefined;
      if (code === "ENOENT") return;
      this.logger.error(
        `Failed to delete profile export ${storageKey}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }

  private writeJsonFile(path: string, value: unknown) {
    return new Promise<void>((resolve, reject) => {
      const stream = createWriteStream(path, { encoding: "utf8" });
      stream.on("error", reject);
      stream.on("finish", () => resolve());
      stream.write(JSON.stringify(value));
      stream.end();
    });
  }
}
