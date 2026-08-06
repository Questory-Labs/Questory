import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CatalogService } from "../catalog/catalog.service";
import { EnrichmentService } from "../enrichment/enrichment.service";
import { TmdbService } from "../tmdb/tmdb.service";
import { UsersService } from "../users/users.service";
import {
  letterboxdAdjacentScrapeCsvPair,
  letterboxdRepairGroupKey,
  letterboxdWatchDedupeKey,
  normalizeLetterboxdName,
  parseLegacyLetterboxdDedupeKey,
  watchedAtDayUtc,
  watchedAtDateStr,
} from "./letterboxd-keys";
import {
  extractLetterboxdCsvs,
  inferLetterboxdKindFromFileName,
  isZipBuffer,
  type LetterboxdCsvKind,
} from "./letterboxd-zip";

const PROGRESS_EVERY = 5;
const YIELD_EVERY = 25;
const WATCH_KINDS = new Set<LetterboxdCsvKind>(["diary", "watched"]);

function watchCsvFilesForImport(
  files: { kind: LetterboxdCsvKind; text: string }[],
) {
  const hasDiary = files.some((f) => f.kind === "diary");
  return files.filter((f) => {
    if (!WATCH_KINDS.has(f.kind)) return false;
    if (f.kind === "watched" && hasDiary) return false;
    return true;
  });
}

/** Minimal CSV line parser (handles quoted fields). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    if (row.some((c) => c.trim())) rows.push(row);
  }
  return rows;
}

function errMessage(err: unknown): string {
  if (err instanceof BadRequestException) {
    const res = err.getResponse();
    if (typeof res === "string") return res;
    if (res && typeof res === "object" && "message" in res) {
      const msg = (res as { message?: string | string[] }).message;
      if (Array.isArray(msg)) return msg.join("; ");
      if (typeof msg === "string") return msg;
    }
  }
  return err instanceof Error ? err.message : String(err);
}

async function yieldEventLoop() {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

type CsvColumns = {
  nameI: number;
  yearI: number;
  dateI: number;
  watchedDateI: number;
  ratingI: number;
};

type WatchIntent = {
  name: string;
  year: number | null;
  dateStr: string;
  rating: number | null;
  fromDiary: boolean;
};

type LetterboxdWatchEvent = {
  id: string;
  userId: string;
  titleId: string;
  watchedAt: Date;
  dedupeKey: string;
  rating: number | null;
  source: string;
  createdAt: Date;
  title: { name: string; year: number | null };
};

function mapColumns(header: string[]): CsvColumns {
  const idx = (name: string) => header.indexOf(name);
  const nameI = idx("name") >= 0 ? idx("name") : idx("title");
  return {
    nameI,
    yearI: idx("year"),
    dateI: idx("date"),
    watchedDateI: idx("watched date"),
    ratingI: idx("rating"),
  };
}

function pickSurvivor(group: LetterboxdWatchEvent[]): LetterboxdWatchEvent {
  return [...group].sort((a, b) => {
    const aRating = a.rating != null ? 1 : 0;
    const bRating = b.rating != null ? 1 : 0;
    if (bRating !== aRating) return bRating - aRating;
    const aCsv = a.source === "letterboxd_csv" ? 1 : 0;
    const bCsv = b.source === "letterboxd_csv" ? 1 : 0;
    if (bCsv !== aCsv) return bCsv - aCsv;
    const aDiary = a.dedupeKey.includes(":diary:") ? 1 : 0;
    const bDiary = b.dedupeKey.includes(":diary:") ? 1 : 0;
    if (bDiary !== aDiary) return bDiary - aDiary;
    return a.createdAt.getTime() - b.createdAt.getTime();
  })[0];
}

function bestRating(group: LetterboxdWatchEvent[]): number | null {
  return group.find((e) => e.rating != null)?.rating ?? null;
}

function bestYear(group: LetterboxdWatchEvent[]): number | null {
  for (const event of group) {
    if (event.title.year != null && Number.isFinite(event.title.year)) {
      return event.title.year;
    }
  }
  return null;
}

function repairDateStr(event: LetterboxdWatchEvent): string {
  const legacy = parseLegacyLetterboxdDedupeKey(event.dedupeKey);
  if (legacy) return legacy.dateStr;
  return watchedAtDateStr(event.watchedAt);
}

@Injectable()
export class LetterboxdService {
  private readonly logger = new Logger(LetterboxdService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly enrichment: EnrichmentService,
    private readonly tmdb: TmdbService,
    private readonly users: UsersService,
  ) {}

  /** Back-compat: bare diary CSV text. */
  async importDiaryCsv(csvText: string, userId?: string, fileName?: string) {
    return this.importUpload({
      buffer: Buffer.from(csvText, "utf8"),
      fileName: fileName ?? "diary.csv",
      include: ["diary"],
      userId,
    });
  }

  async getActiveJob(userId?: string) {
    const user = await this.users.resolveUser(userId);
    if (!user) return null;
    const job = await this.prisma.importJob.findFirst({
      where: {
        userId: user.id,
        source: "letterboxd_csv",
        status: "running",
      },
      orderBy: { createdAt: "desc" },
    });
    if (!job) return null;
    const processed = job.accepted + job.skipped;
    return {
      id: job.id,
      source: job.source,
      status: job.status,
      fileName: job.fileName,
      total: job.total,
      accepted: job.accepted,
      skipped: job.skipped,
      processed,
      percent:
        job.total > 0
          ? Math.min(100, Math.round((processed / job.total) * 100))
          : null,
      lastError: job.lastError,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
    };
  }

  async repairLetterboxdDuplicates(userId?: string) {
    const events = await this.prisma.watchEvent.findMany({
      where: {
        OR: [
          { source: { in: ["letterboxd", "letterboxd_csv"] } },
          { dedupeKey: { startsWith: "letterboxd_csv:" } },
        ],
        ...(userId ? { userId } : {}),
      },
      include: {
        title: { select: { name: true, year: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    let legacyKeys = 0;
    let alreadyCanonical = 0;
    const groups = new Map<string, LetterboxdWatchEvent[]>();
    const assigned = new Set<string>();

    const byUserTitle = new Map<string, LetterboxdWatchEvent[]>();
    for (const event of events) {
      const bucket = `${event.userId}:${normalizeLetterboxdName(event.title.name)}`;
      const list = byUserTitle.get(bucket) ?? [];
      list.push(event);
      byUserTitle.set(bucket, list);
    }

    for (const [bucket, bucketEvents] of byUserTitle) {
      for (let i = 0; i < bucketEvents.length; i++) {
        const a = bucketEvents[i];
        if (assigned.has(a.id)) continue;
        for (let j = i + 1; j < bucketEvents.length; j++) {
          const b = bucketEvents[j];
          if (assigned.has(b.id)) continue;
          if (!letterboxdAdjacentScrapeCsvPair(a, b)) continue;
          groups.set(`${bucket}:adjacent`, [a, b]);
          assigned.add(a.id);
          assigned.add(b.id);
          break;
        }
      }
    }

    for (const event of events) {
      if (parseLegacyLetterboxdDedupeKey(event.dedupeKey)) {
        legacyKeys += 1;
      } else if (event.dedupeKey.startsWith("letterboxd_csv:watch:")) {
        alreadyCanonical += 1;
      }

      if (assigned.has(event.id)) continue;

      const key = letterboxdRepairGroupKey(
        event.userId,
        event.dedupeKey,
        event.title.name,
        event.watchedAt,
      );
      const list = groups.get(key) ?? [];
      list.push(event);
      groups.set(key, list);
    }

    const affectedUsers = new Set<string>();
    let merged = 0;
    let migrated = 0;
    let duplicateGroups = 0;

    for (const group of groups.values()) {
      if (group.length > 1) duplicateGroups += 1;

      const survivor = pickSurvivor(group);
      const dateStr = repairDateStr(survivor);
      const newKey = letterboxdWatchDedupeKey(
        survivor.title.name,
        bestYear(group),
        dateStr,
      );
      const rating = bestRating(group);
      const watchedAt = watchedAtDayUtc(dateStr) ?? survivor.watchedAt;

      if (group.length > 1) {
        const toDelete = group
          .filter((e) => e.id !== survivor.id)
          .map((e) => e.id);
        await this.prisma.watchEvent.deleteMany({
          where: { id: { in: toDelete } },
        });
        merged += toDelete.length;
      }

      const conflict = await this.prisma.watchEvent.findUnique({
        where: {
          userId_dedupeKey: { userId: survivor.userId, dedupeKey: newKey },
        },
      });

      if (conflict && conflict.id !== survivor.id) {
        if (rating != null && conflict.rating == null) {
          await this.prisma.watchEvent.update({
            where: { id: conflict.id },
            data: { rating },
          });
        }
        const toDelete = group.map((e) => e.id);
        await this.prisma.watchEvent.deleteMany({
          where: { id: { in: toDelete } },
        });
        merged += toDelete.length;
        affectedUsers.add(survivor.userId);
        continue;
      }

      const needsUpdate =
        survivor.dedupeKey !== newKey ||
        survivor.rating !== rating ||
        survivor.watchedAt.getTime() !== watchedAt.getTime();

      if (needsUpdate) {
        await this.prisma.watchEvent.update({
          where: { id: survivor.id },
          data: {
            dedupeKey: newKey,
            rating,
            watchedAt,
          },
        });
        if (group.length === 1) migrated += 1;
      }

      affectedUsers.add(survivor.userId);
    }

    for (const uid of affectedUsers) {
      await this.catalog.rebuildWatchHourBuckets(uid);
    }

    return {
      scanned: events.length,
      groups: groups.size,
      legacyKeys,
      alreadyCanonical,
      duplicateGroups,
      merged,
      migrated,
    };
  }

  async importUpload(input: {
    buffer: Buffer;
    fileName?: string;
    include?: LetterboxdCsvKind[];
    userId?: string;
  }) {
    const user = await this.users.resolveUser(input.userId);
    if (!user) throw new BadRequestException("No user for import");

    const active = await this.prisma.importJob.findFirst({
      where: {
        userId: user.id,
        source: "letterboxd_csv",
        status: "running",
      },
      orderBy: { createdAt: "desc" },
    });
    if (active) {
      throw new ConflictException({
        statusCode: 409,
        error: "Conflict",
        message: "A Letterboxd import is already in progress",
        jobId: active.id,
      });
    }

    await this.repairLetterboxdDuplicates(user.id);

    const fileName = (input.fileName || "letterboxd").replace(/[/\\]/g, "_");
    const job = await this.prisma.importJob.create({
      data: {
        userId: user.id,
        source: "letterboxd_csv",
        status: "running",
        fileName,
      },
    });

    let accepted = 0;
    let skipped = 0;

    try {
      const files = this.resolveFiles(input.buffer, fileName, input.include);
      const total = files.reduce((sum, f) => {
        const rows = parseCsv(f.text.replace(/^\uFEFF/, ""));
        return sum + Math.max(0, rows.length - 1);
      }, 0);
      await this.prisma.importJob.update({
        where: { id: job.id },
        data: { total },
      });

      const used: LetterboxdCsvKind[] = [];
      const fileErrors: string[] = [];

      const watchFiles = files.filter((f) => WATCH_KINDS.has(f.kind));
      const effectiveWatchFiles = watchCsvFilesForImport(watchFiles);
      const otherFiles = files.filter((f) => !WATCH_KINDS.has(f.kind));

      const ratingsFile = files.find((f) => f.kind === "ratings");

      if (effectiveWatchFiles.length) {
        try {
          const result = await this.importMergedWatches(
            effectiveWatchFiles,
            user.id,
            job.id,
            { accepted, skipped },
            ratingsFile?.text,
          );
          accepted = result.accepted;
          skipped = result.skipped;
          for (const f of effectiveWatchFiles) used.push(f.kind);
        } catch (err) {
          const message = errMessage(err);
          fileErrors.push(`watch csvs: ${message}`);
          this.logger.warn(`Letterboxd watch CSVs failed: ${message}`);
        }
      }

      for (const file of otherFiles) {
        try {
          const result = await this.importCsvKind(
            file.kind,
            file.text,
            user.id,
            job.id,
            { accepted, skipped },
          );
          accepted = result.accepted;
          skipped = result.skipped;
          used.push(file.kind);
        } catch (err) {
          const message = errMessage(err);
          fileErrors.push(`${file.kind}.csv: ${message}`);
          this.logger.warn(
            `Letterboxd ${file.kind}.csv failed (continuing): ${message}`,
          );
        }
      }

      if (!used.length) {
        throw new BadRequestException(
          fileErrors.length
            ? fileErrors.join("; ")
            : "No Letterboxd CSV files could be imported",
        );
      }

      const lastError = fileErrors.length
        ? fileErrors.join("; ").slice(0, 500)
        : null;

      await this.prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: "completed",
          accepted,
          skipped,
          lastError,
          completedAt: new Date(),
        },
      });

      return {
        ok: true,
        jobId: job.id,
        accepted,
        skipped,
        files: used,
        warnings: fileErrors.length ? fileErrors : undefined,
      };
    } catch (err) {
      const message = errMessage(err);
      await this.prisma.importJob
        .update({
          where: { id: job.id },
          data: {
            status: "failed",
            accepted,
            skipped,
            lastError: message.slice(0, 500),
            completedAt: new Date(),
          },
        })
        .catch((updateErr) => {
          this.logger.warn(
            `Failed to mark Letterboxd job ${job.id} failed: ${errMessage(updateErr)}`,
          );
        });
      this.logger.warn(`Letterboxd import failed: ${message}`);
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(message);
    }
  }

  private resolveFiles(
    buffer: Buffer,
    fileName: string,
    include?: LetterboxdCsvKind[],
  ) {
    if (isZipBuffer(buffer, fileName)) {
      try {
        return extractLetterboxdCsvs(buffer, include);
      } catch (err) {
        throw new BadRequestException(
          err instanceof Error ? err.message : "Invalid Letterboxd zip",
        );
      }
    }

    const kind =
      include?.length === 1
        ? include[0]
        : inferLetterboxdKindFromFileName(fileName);
    if (include?.length && !include.includes(kind)) {
      throw new BadRequestException(
        `Uploaded CSV is ${kind}.csv but include did not request it`,
      );
    }
    return [
      {
        kind,
        path: fileName,
        text: buffer.toString("utf8"),
      },
    ];
  }

  private async importMergedWatches(
    files: { kind: LetterboxdCsvKind; text: string }[],
    userId: string,
    jobId: string,
    counters: { accepted: number; skipped: number },
    ratingsCsvText?: string,
  ) {
    const intents = new Map<string, WatchIntent>();
    let { accepted, skipped } = counters;

    for (const file of files) {
      if (file.kind !== "diary" && file.kind !== "watched") continue;
      const rows = parseCsv(file.text.replace(/^\uFEFF/, ""));
      if (rows.length < 2) {
        throw new BadRequestException(`${file.kind}.csv has no data rows`);
      }
      const header = rows[0].map((h) => h.trim().toLowerCase());
      const cols = mapColumns(header);

      if (cols.nameI < 0) {
        throw new BadRequestException(
          `${file.kind}.csv must include a Name/Title column`,
        );
      }

      if (file.kind === "diary" && cols.watchedDateI < 0 && cols.dateI < 0) {
        throw new BadRequestException(
          "diary.csv must include Watched Date or Date columns",
        );
      }

      for (const row of rows.slice(1)) {
        try {
          const outcome = this.mergeWatchRow(file.kind, row, cols, intents);
          if (outcome === "accepted") accepted += 1;
          else skipped += 1;
        } catch {
          skipped += 1;
        }
      }
    }

    if (ratingsCsvText) {
      this.mergeRatingsIntoIntents(ratingsCsvText, intents);
    }

    let processed = 0;
    const totalIntents = intents.size;
    for (const intent of intents.values()) {
      try {
        await this.writeWatchIntent(intent, userId);
      } catch (err) {
        this.logger.debug(`Skip watch intent: ${errMessage(err)}`);
      }

      processed += 1;
      if (
        processed % PROGRESS_EVERY === 0 ||
        processed === totalIntents
      ) {
        await this.prisma.importJob.update({
          where: { id: jobId },
          data: { accepted, skipped },
        });
      }
      if (processed % YIELD_EVERY === 0) {
        await yieldEventLoop();
      }
    }

    return { accepted, skipped };
  }

  private mergeWatchRow(
    kind: "diary" | "watched",
    row: string[],
    cols: CsvColumns,
    intents: Map<string, WatchIntent>,
  ): "accepted" | "skipped" {
    const name = (row[cols.nameI] || "").trim();
    if (!name) return "skipped";

    const yearRaw =
      cols.yearI >= 0 && row[cols.yearI] ? Number(row[cols.yearI]) : null;
    const year = Number.isFinite(yearRaw as number) ? yearRaw : null;

    const ratingRaw =
      cols.ratingI >= 0 && row[cols.ratingI]
        ? Number(row[cols.ratingI])
        : null;
    const rating = Number.isFinite(ratingRaw as number) ? ratingRaw : null;

    const dateStr = (
      (kind === "diary"
        ? row[cols.watchedDateI >= 0 ? cols.watchedDateI : cols.dateI]
        : row[cols.dateI >= 0 ? cols.dateI : cols.watchedDateI]) || ""
    ).trim();

    if (!dateStr || !watchedAtDayUtc(dateStr)) return "skipped";

    const dedupeKey = letterboxdWatchDedupeKey(name, year, dateStr);
    const existing = intents.get(dedupeKey);

    if (!existing) {
      intents.set(dedupeKey, {
        name,
        year,
        dateStr,
        rating,
        fromDiary: kind === "diary",
      });
      return "accepted";
    }

    if (kind === "diary") {
      intents.set(dedupeKey, {
        ...existing,
        fromDiary: true,
        rating: rating ?? existing.rating,
      });
    } else {
      intents.set(dedupeKey, {
        ...existing,
        rating: existing.rating ?? rating,
      });
    }
    return "accepted";
  }

  private mergeRatingsIntoIntents(
    csvText: string,
    intents: Map<string, WatchIntent>,
  ) {
    const rows = parseCsv(csvText.replace(/^\uFEFF/, ""));
    if (rows.length < 2) return;

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const cols = mapColumns(header);
    if (cols.nameI < 0 || cols.ratingI < 0) return;

    const byFilm = new Map<string, WatchIntent[]>();
    for (const intent of intents.values()) {
      const key = `${normalizeLetterboxdName(intent.name)}:${intent.year ?? ""}`;
      const list = byFilm.get(key) ?? [];
      list.push(intent);
      byFilm.set(key, list);
    }

    for (const row of rows.slice(1)) {
      const name = (row[cols.nameI] || "").trim();
      if (!name) continue;

      const yearRaw =
        cols.yearI >= 0 && row[cols.yearI] ? Number(row[cols.yearI]) : null;
      const year = Number.isFinite(yearRaw as number) ? yearRaw : null;

      const ratingRaw =
        cols.ratingI >= 0 && row[cols.ratingI]
          ? Number(row[cols.ratingI])
          : null;
      const rating = Number.isFinite(ratingRaw as number) ? ratingRaw : null;
      if (rating == null) continue;

      const key = `${normalizeLetterboxdName(name)}:${year ?? ""}`;
      const matches = byFilm.get(key);
      if (!matches?.length) continue;

      for (const intent of matches) {
        intent.rating = rating;
      }
    }
  }

  private async applyRatingToTitleWatch(
    userId: string,
    titleId: string,
    rating: number,
    watchedAt?: Date | null,
  ) {
    if (watchedAt) {
      const patched = await this.prisma.watchEvent.updateMany({
        where: { userId, titleId, watchedAt, rating: null },
        data: { rating },
      });
      if (patched.count > 0) return;
    }

    const latest = await this.prisma.watchEvent.findFirst({
      where: { userId, titleId, rating: null },
      orderBy: { watchedAt: "desc" },
    });
    if (latest) {
      await this.prisma.watchEvent.update({
        where: { id: latest.id },
        data: { rating },
      });
    }
  }

  private async writeWatchIntent(
    intent: WatchIntent,
    userId: string,
  ): Promise<"accepted" | "skipped"> {
    const at = watchedAtDayUtc(intent.dateStr);
    if (!at) return "skipped";

    let tmdbId: number | null = null;
    if (this.tmdb.configured()) {
      try {
        const hit = await this.tmdb.searchMovie(intent.name, intent.year);
        tmdbId = hit?.id ?? null;
      } catch {
        tmdbId = null;
      }
    }

    const title = await this.catalog.upsertTitle({
      type: "movie",
      name: intent.name,
      year: intent.year,
      tmdbId,
    });

    const dedupeKey = letterboxdWatchDedupeKey(
      intent.name,
      intent.year,
      intent.dateStr,
    );

    await this.catalog.recordWatch({
      userId,
      titleId: title.id,
      watchedAt: at,
      source: "letterboxd_csv",
      dedupeKey,
      action: "import",
      rating: intent.rating,
      precision: "day",
    });

    if (intent.rating != null) {
      await this.catalog.upsertListState({
        userId,
        titleId: title.id,
        listType: "rating",
        source: "letterboxd_csv",
        rating: intent.rating,
        listedAt: at,
      });
    }

    this.enrichment.enqueueTitle(title.id);
    return "accepted";
  }

  private async importCsvKind(
    kind: LetterboxdCsvKind,
    csvText: string,
    userId: string,
    jobId: string,
    counters: { accepted: number; skipped: number },
  ) {
    const rows = parseCsv(csvText.replace(/^\uFEFF/, ""));
    if (rows.length < 2) {
      throw new BadRequestException(`${kind}.csv has no data rows`);
    }
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const cols = mapColumns(header);

    if (cols.nameI < 0) {
      throw new BadRequestException(
        `${kind}.csv must include a Name/Title column`,
      );
    }

    if (kind === "ratings" && cols.ratingI < 0) {
      throw new BadRequestException("ratings.csv must include a Rating column");
    }

    let { accepted, skipped } = counters;
    let processedInFile = 0;

    for (const row of rows.slice(1)) {
      try {
        const outcome = await this.importListRow(kind, row, cols, userId);
        if (outcome === "accepted") accepted += 1;
        else skipped += 1;
      } catch (err) {
        skipped += 1;
        this.logger.debug(`Skip ${kind} row: ${errMessage(err)}`);
      }

      processedInFile += 1;
      if (
        processedInFile % PROGRESS_EVERY === 0 ||
        processedInFile === rows.length - 1
      ) {
        await this.prisma.importJob.update({
          where: { id: jobId },
          data: { accepted, skipped },
        });
      }
      if (processedInFile % YIELD_EVERY === 0) {
        await yieldEventLoop();
      }
    }

    return { accepted, skipped };
  }

  private async importListRow(
    kind: LetterboxdCsvKind,
    row: string[],
    cols: CsvColumns,
    userId: string,
  ): Promise<"accepted" | "skipped"> {
    const name = (row[cols.nameI] || "").trim();
    if (!name) return "skipped";

    const yearRaw =
      cols.yearI >= 0 && row[cols.yearI] ? Number(row[cols.yearI]) : null;
    const year = Number.isFinite(yearRaw as number) ? yearRaw : null;

    const ratingRaw =
      cols.ratingI >= 0 && row[cols.ratingI]
        ? Number(row[cols.ratingI])
        : null;
    const rating = Number.isFinite(ratingRaw as number) ? ratingRaw : null;

    const dateStr = (
      row[cols.dateI >= 0 ? cols.dateI : cols.watchedDateI] || ""
    ).trim();
    const at = dateStr ? watchedAtDayUtc(dateStr) : null;

    let tmdbId: number | null = null;
    if (this.tmdb.configured()) {
      try {
        const hit = await this.tmdb.searchMovie(name, year);
        tmdbId = hit?.id ?? null;
      } catch {
        tmdbId = null;
      }
    }

    const title = await this.catalog.upsertTitle({
      type: "movie",
      name,
      year,
      tmdbId,
    });

    if (kind === "ratings") {
      if (rating == null) return "skipped";
      await this.catalog.upsertListState({
        userId,
        titleId: title.id,
        listType: "rating",
        source: "letterboxd_csv",
        rating,
        listedAt: at,
      });
      await this.applyRatingToTitleWatch(userId, title.id, rating, at);
      this.enrichment.enqueueTitle(title.id);
      return "accepted";
    }

    if (kind === "watchlist") {
      await this.catalog.upsertListState({
        userId,
        titleId: title.id,
        listType: "watchlist",
        source: "letterboxd_csv",
        listedAt: at,
      });
      this.enrichment.enqueueTitle(title.id);
      return "accepted";
    }

    return "skipped";
  }
}
