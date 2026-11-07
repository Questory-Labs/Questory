import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { LetterboxdService } from "../../watch/imports/letterboxd.service";
import {
  BANGUMI_DEDUPE_KEYS_MIGRATION_KEY,
  getMigrationDefinition,
  MIGRATION_DEFINITIONS,
  WATCH_HOUR_BUCKETS_MIGRATION_KEY,
  WEBHOOK_MUSIC_EVENTS_MIGRATION_KEY,
} from "./migration-definitions";
import { SourceDataRepairService } from "./source-data-repair.service";

@Injectable()
export class MigrationsService {
  private readonly logger = new Logger(MigrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly letterboxd: LetterboxdService,
    private readonly sourceRepair: SourceDataRepairService,
  ) {}

  async listMigrations() {
    const rows = await this.prisma.dataMigration.findMany();
    const byKey = new Map(rows.map((row) => [row.key, row]));

    return {
      migrations: MIGRATION_DEFINITIONS.map((def) => {
        const row = byKey.get(def.key);
        return {
          key: def.key,
          name: def.name,
          description: def.description,
          hasRun: Boolean(row),
          status: row?.status ?? "not_run",
          runCount: row?.runCount ?? 0,
          lastStartedAt: row?.lastStartedAt?.toISOString() ?? null,
          lastCompletedAt: row?.lastCompletedAt?.toISOString() ?? null,
          lastFailedAt:
            row?.status === "failed" ? row.updatedAt.toISOString() : null,
          lastError: row?.lastError ?? null,
          lastResult: row?.lastResult ?? null,
          canRun: !row || row.status !== "running",
        };
      }),
    };
  }

  async previewMigration(key: string) {
    if (!getMigrationDefinition(key)) {
      throw new NotFoundException(`Unknown migration: ${key}`);
    }
    const result = await this.runSourceRepair(key, false);
    if (!result) {
      throw new BadRequestException(`Migration ${key} has no preview`);
    }
    return { ok: true, key, result };
  }

  async runMigration(key: string, adminUserId: string) {
    const def = getMigrationDefinition(key);
    if (!def) {
      throw new NotFoundException(`Unknown migration: ${key}`);
    }

    const existing = await this.prisma.dataMigration.findUnique({
      where: { key },
    });
    if (existing?.status === "running") {
      throw new ConflictException(`Migration ${key} is already running`);
    }

    const startedAt = new Date();
    await this.prisma.dataMigration.upsert({
      where: { key },
      create: {
        key,
        status: "running",
        lastStartedAt: startedAt,
        runCount: 1,
        triggeredByUserId: adminUserId,
        lastError: null,
      },
      update: {
        status: "running",
        lastStartedAt: startedAt,
        runCount: { increment: 1 },
        triggeredByUserId: adminUserId,
        lastError: null,
        lastCompletedAt: null,
      },
    });

    try {
      const result = await this.executeMigration(key);
      const completedAt = new Date();
      await this.prisma.dataMigration.update({
        where: { key },
        data: {
          status: "completed",
          lastCompletedAt: completedAt,
          lastResult: JSON.stringify(result ?? {}),
        },
      });
      this.logger.log(`Migration ${key} completed`);
      return { ok: true, key, result };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.dataMigration.update({
        where: { key },
        data: {
          status: "failed",
          lastError: message.slice(0, 2000),
        },
      });
      this.logger.warn(`Migration ${key} failed: ${message}`);
      throw new BadRequestException(message);
    }
  }

  private async executeMigration(key: string) {
    switch (key) {
      case "letterboxd_watch_dedupe_v1":
        return this.letterboxd.repairLetterboxdDuplicates();
      default: {
        const result = await this.runSourceRepair(key, true);
        if (result) return result;
        throw new BadRequestException(`No handler for migration: ${key}`);
      }
    }
  }

  private runSourceRepair(key: string, apply: boolean) {
    switch (key) {
      case BANGUMI_DEDUPE_KEYS_MIGRATION_KEY:
        return this.sourceRepair.repairBangumiKeys(apply);
      case WEBHOOK_MUSIC_EVENTS_MIGRATION_KEY:
        return this.sourceRepair.repairWebhookMusic(apply);
      case WATCH_HOUR_BUCKETS_MIGRATION_KEY:
        return this.sourceRepair.rebuildWatchBuckets(apply);
      default:
        return null;
    }
  }
}
