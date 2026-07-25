import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CatalogService } from "../catalog/catalog.service";
import { EnrichmentService } from "../enrichment/enrichment.service";
import { TmdbService } from "../tmdb/tmdb.service";
import { UsersService } from "../users/users.service";

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

  async importDiaryCsv(csvText: string, userId?: string, fileName?: string) {
    const user = await this.users.resolveUser(userId);
    if (!user) throw new BadRequestException("No user for import");

    const job = await this.prisma.importJob.create({
      data: {
        userId: user.id,
        source: "letterboxd_csv",
        status: "running",
        fileName: fileName ?? null,
      },
    });

    try {
      const rows = parseCsv(csvText.replace(/^\uFEFF/, ""));
      if (rows.length < 2) {
        throw new BadRequestException("CSV has no data rows");
      }
      const header = rows[0].map((h) => h.trim().toLowerCase());
      const idx = (name: string) => header.indexOf(name);

      const nameI = idx("name") >= 0 ? idx("name") : idx("title");
      const yearI = idx("year");
      const dateI = idx("watched date") >= 0 ? idx("watched date") : idx("date");
      const ratingI = idx("rating");

      if (nameI < 0 || dateI < 0) {
        throw new BadRequestException(
          "CSV must include Name/Title and Watched Date columns (Letterboxd diary export)",
        );
      }

      let accepted = 0;
      let skipped = 0;

      for (const row of rows.slice(1)) {
        const name = (row[nameI] || "").trim();
        const dateStr = (row[dateI] || "").trim();
        if (!name || !dateStr) {
          skipped += 1;
          continue;
        }
        const year =
          yearI >= 0 && row[yearI] ? Number(row[yearI]) : null;
        const rating =
          ratingI >= 0 && row[ratingI] ? Number(row[ratingI]) : null;

        // Day precision — noon UTC
        const watchedAt = new Date(`${dateStr}T12:00:00.000Z`);
        if (Number.isNaN(watchedAt.getTime())) {
          skipped += 1;
          continue;
        }

        let tmdbId: number | null = null;
        if (this.tmdb.configured()) {
          const hit = await this.tmdb.searchMovie(name, year);
          tmdbId = hit?.id ?? null;
        }

        const title = await this.catalog.upsertTitle({
          type: "movie",
          name,
          year: Number.isFinite(year as number) ? year : null,
          tmdbId,
        });

        const dedupeKey = `letterboxd_csv:${normalizeKey(name)}:${dateStr}`;
        await this.catalog.recordWatch({
          userId: user.id,
          titleId: title.id,
          watchedAt,
          source: "letterboxd_csv",
          dedupeKey,
          action: "import",
          rating: Number.isFinite(rating as number) ? rating : null,
          precision: "day",
        });

        if (Number.isFinite(rating as number)) {
          await this.catalog.upsertListState({
            userId: user.id,
            titleId: title.id,
            listType: "rating",
            source: "letterboxd_csv",
            rating,
            listedAt: watchedAt,
          });
        }

        this.enrichment.enqueueTitle(title.id);
        accepted += 1;
      }

      await this.prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: "completed",
          accepted,
          skipped,
          completedAt: new Date(),
        },
      });

      return { ok: true, jobId: job.id, accepted, skipped };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          lastError: message.slice(0, 500),
          completedAt: new Date(),
        },
      });
      this.logger.warn(`Letterboxd import failed: ${message}`);
      throw err;
    }
  }
}

function normalizeKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}
