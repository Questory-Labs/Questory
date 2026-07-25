import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CatalogService } from "../catalog/catalog.service";
import { TmdbService } from "../tmdb/tmdb.service";

@Injectable()
export class EnrichmentService implements OnModuleInit {
  private readonly logger = new Logger(EnrichmentService.name);
  private queue: string[] = [];
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly tmdb: TmdbService,
  ) {}

  onModuleInit() {
    void this.drain();
  }

  enqueueTitle(titleId: string) {
    if (!this.queue.includes(titleId)) this.queue.push(titleId);
    void this.drain();
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
    if (!title) return;

    const fresh =
      title.metadataSyncedAt &&
      Date.now() - title.metadataSyncedAt.getTime() < 7 * 24 * 60 * 60 * 1000;
    if (fresh) return;

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
        detail =
          title.type === "movie"
            ? await this.tmdb.searchMovie(title.name, title.year)
            : await this.tmdb.searchTv(title.name, title.year);
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

      await this.prisma.title.update({
        where: { id: titleId },
        data: {
          tmdbId: detail.id,
          overview: detail.overview ?? title.overview,
          runtimeMinutes: detail.runtime ?? title.runtimeMinutes,
          year: year ?? title.year,
          posterUrl: this.tmdb.posterUrl(detail.poster_path) ?? title.posterUrl,
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
