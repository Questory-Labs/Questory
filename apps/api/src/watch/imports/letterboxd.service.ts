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
  extractLetterboxdCsvs,
  inferLetterboxdKindFromFileName,
  isZipBuffer,
  type LetterboxdCsvKind,
} from "./letterboxd-zip";

const PROGRESS_EVERY = 5;
const YIELD_EVERY = 25;

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

function normalizeKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

function dayUtc(dateStr: string): Date | null {
  const watchedAt = new Date(`${dateStr}T12:00:00.000Z`);
  if (Number.isNaN(watchedAt.getTime())) return null;
  return watchedAt;
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

      for (const file of files) {
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

    if (kind === "diary" && cols.watchedDateI < 0 && cols.dateI < 0) {
      throw new BadRequestException(
        "diary.csv must include Watched Date or Date columns",
      );
    }

    if (kind === "ratings" && cols.ratingI < 0) {
      throw new BadRequestException("ratings.csv must include a Rating column");
    }

    let { accepted, skipped } = counters;
    let processedInFile = 0;

    for (const row of rows.slice(1)) {
      try {
        const outcome = await this.importRow(kind, row, cols, userId);
        if (outcome === "accepted") accepted += 1;
        else skipped += 1;
      } catch (err) {
        skipped += 1;
        this.logger.debug(
          `Skip ${kind} row: ${errMessage(err)}`,
        );
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

  private async importRow(
    kind: LetterboxdCsvKind,
    row: string[],
    cols: CsvColumns,
    userId: string,
  ): Promise<"accepted" | "skipped"> {
    const name = (row[cols.nameI] || "").trim();
    if (!name) return "skipped";

    const year =
      cols.yearI >= 0 && row[cols.yearI] ? Number(row[cols.yearI]) : null;
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

    const at = dateStr ? dayUtc(dateStr) : null;

    // TMDB already swallows network errors; keep lookup optional.
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
      year: Number.isFinite(year as number) ? year : null,
      tmdbId,
    });

    if (kind === "diary") {
      if (!at || !dateStr) return "skipped";
      const dedupeKey = `letterboxd_csv:diary:${normalizeKey(name)}:${dateStr}`;
      await this.catalog.recordWatch({
        userId,
        titleId: title.id,
        watchedAt: at,
        source: "letterboxd_csv",
        dedupeKey,
        action: "import",
        rating,
        precision: "day",
      });
      if (rating != null) {
        await this.catalog.upsertListState({
          userId,
          titleId: title.id,
          listType: "rating",
          source: "letterboxd_csv",
          rating,
          listedAt: at,
        });
      }
      this.enrichment.enqueueTitle(title.id);
      return "accepted";
    }

    if (kind === "watched") {
      if (!at || !dateStr) return "skipped";
      const dedupeKey = `letterboxd_csv:watched:${normalizeKey(name)}:${dateStr}`;
      await this.catalog.recordWatch({
        userId,
        titleId: title.id,
        watchedAt: at,
        source: "letterboxd_csv",
        dedupeKey,
        action: "import",
        precision: "day",
      });
      this.enrichment.enqueueTitle(title.id);
      return "accepted";
    }

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
      this.enrichment.enqueueTitle(title.id);
      return "accepted";
    }

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
}
