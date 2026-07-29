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
  getMigrationDefinition,
  MIGRATION_DEFINITIONS,
} from "./migration-definitions";

@Injectable()
export class MigrationsService {
  private readonly logger = new Logger(MigrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly letterboxd: LetterboxdService,
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
          lastError: row?.lastError ?? null,
          lastResult: row?.lastResult ?? null,
          canRun: !row || row.status !== "running",
        };
      }),
    };
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
      default:
        throw new BadRequestException(`No handler for migration: ${key}`);
    }
  }
}
