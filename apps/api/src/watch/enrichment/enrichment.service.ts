import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CatalogService } from "../catalog/catalog.service";
import { TmdbService } from "../tmdb/tmdb.service";

const FRESH_MS = 7 * 24 * 60 * 60 * 1000;
/** Cap startup backfill so we don't hammer TMDB after a large import. */
const BACKFILL_BATCH = 200;

@Injectable()
export class EnrichmentService implements OnModuleInit {
  private readonly logger = new Logger(EnrichmentService.name);
  private queue: string[] = [];
  private readonly forceIds = new Set<string>();
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly tmdb: TmdbService,
  ) {}

  onModuleInit() {
    void this.enqueueMissingRuntimes().finally(() => {
      void this.drain();
    });
  }

  enqueueTitle(titleId: string, opts?: { force?: boolean }) {
    if (opts?.force) this.forceIds.add(titleId);
    if (!this.queue.includes(titleId)) this.queue.push(titleId);
    void this.drain();
  }

  /** Re-queue titles that still lack runtime (e.g. queue lost on restart). */
  async enqueueMissingRuntimes(limit = BACKFILL_BATCH) {
    if (!this.tmdb.configured()) return 0;
    const titles = await this.prisma.title.findMany({
      where: {
        OR: [{ runtimeMinutes: null }, { runtimeMinutes: { lte: 0 } }],
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: { id: true },
    });
    for (const t of titles) this.enqueueTitle(t.id, { force: true });
    if (titles.length) {
      this.logger.log(`Queued ${titles.length} titles missing runtime`);
    }
    return titles.length;
  }

  private async drain() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length) {
        const titleId = this.queue.shift()!;
        await this.enrichOne(titleId);
        await new Promise((r) => setTimeout(r, 300));
      }
    } finally {
      this.running = false;
    }
  }

  private async enrichOne(titleId: string) {
    const title = await this.prisma.title.findUnique({ where: { id: titleId } });
    if (!title) {
      this.forceIds.delete(titleId);
      return;
    }

    const force = this.forceIds.delete(titleId);
    const recentlySynced =
      title.metadataSyncedAt &&
      Date.now() - title.metadataSyncedAt.getTime() < FRESH_MS;
    if (recentlySynced && !force) return;

    const job = await this.prisma.titleEnrichmentJob.create({
      data: { titleId, status: "running" },
    });

    try {
      if (!this.tmdb.configured()) {
        await this.prisma.titleEnrichmentJob.update({
          where: { id: job.id },
          data: {
            status: "failed",
            lastError: "TMDB_API_KEY unset",
            completedAt: new Date(),
          },
        });
        return;
      }

      let detail =
        title.tmdbId != null
          ? title.type === "movie"
            ? await this.tmdb.getMovie(title.tmdbId)
            : await this.tmdb.getTv(title.tmdbId)
          : null;

      if (!detail) {
        const hit =
          title.type === "movie"
            ? await this.tmdb.searchMovie(title.name, title.year)
            : await this.tmdb.searchTv(title.name, title.year);
        // Search payloads omit runtime — always fetch full detail.
        detail =
          title.type === "movie"
            ? await this.tmdb.resolveMovieDetail(hit)
            : await this.tmdb.resolveTvDetail(hit);
      }

      if (!detail) {
        await this.prisma.titleEnrichmentJob.update({
          where: { id: job.id },
          data: {
            status: "failed",
            lastError: "TMDB not found",
            attempts: 1,
            completedAt: new Date(),
          },
        });
        return;
      }

      const year =
        this.tmdb.yearFromDate(detail.release_date) ??
        this.tmdb.yearFromDate(detail.first_air_date);
      const runtime =
        this.tmdb.runtimeMinutes(detail) ?? title.runtimeMinutes ?? null;

      await this.prisma.title.update({
        where: { id: titleId },
        data: {
          tmdbId: detail.id,
          overview: detail.overview ?? title.overview,
          runtimeMinutes: runtime,
          year: year ?? title.year,
          ...(title.imageManual
            ? {}
            : {
                posterUrl:
                  this.tmdb.posterUrl(detail.poster_path) ?? title.posterUrl,
              }),
          backdropUrl:
            this.tmdb.posterUrl(detail.backdrop_path) ?? title.backdropUrl,
          originalLanguage: detail.original_language ?? title.originalLanguage,
          imdbId: detail.imdb_id ?? title.imdbId,
          metadataSyncedAt: new Date(),
        },
      });

      const genres = (detail.genres || []).map((g) => g.name);
      if (genres.length) await this.catalog.linkGenres(titleId, genres, "tmdb");

      await this.prisma.titleEnrichmentJob.update({
        where: { id: job.id },
        data: { status: "completed", completedAt: new Date(), attempts: 1 },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Enrich ${titleId}: ${message}`);
      await this.prisma.titleEnrichmentJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          lastError: message.slice(0, 500),
          attempts: 1,
          completedAt: new Date(),
        },
      });
    }
  }
}
