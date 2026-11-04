import { BadRequestException, Injectable, Optional } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EnrichmentService as MusicEnrichmentService } from "../music/enrichment/enrichment.service";
import { EnrichmentService as WatchEnrichmentService } from "../watch/enrichment/enrichment.service";
import { REQUEUE_ALL_FAILED_LIMIT } from "./admin.constants";

export function latestPerEntity<T extends { id: string }>(
  rows: T[],
  entityOf: (row: T) => string,
): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = entityOf(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export type RequeueEnrichmentInput = {
  domain: "music" | "watch";
  ids?: string[];
  allFailed?: boolean;
};

@Injectable()
export class AdminEnrichmentService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly music?: MusicEnrichmentService,
    @Optional() private readonly watch?: WatchEnrichmentService,
  ) {}

  async requeueFailed(input: RequeueEnrichmentInput) {
    const ids = input.ids?.length ? input.ids : undefined;
    if (!ids && !input.allFailed) {
      throw new BadRequestException("Provide ids or allFailed");
    }
    const where = { status: "failed", ...(ids ? { id: { in: ids } } : {}) };
    return input.domain === "music"
      ? this.requeueMusic(where)
      : this.requeueWatch(where);
  }

  private async requeueMusic(where: { status: string; id?: { in: string[] } }) {
    if (!this.music) throw new BadRequestException("Music enrichment unavailable");
    const rows = latestPerEntity(
      await this.prisma.enrichmentJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: REQUEUE_ALL_FAILED_LIMIT,
        select: { id: true, trackId: true },
      }),
      (r) => r.trackId,
    );
    if (!rows.length) return { ok: true as const, domain: "music" as const, requeued: 0 };
    const { count } = await this.prisma.enrichmentJob.updateMany({
      where: { id: { in: rows.map((r) => r.id) }, status: "failed" },
      data: { status: "pending", lastError: null, completedAt: null },
    });
    for (const trackId of new Set(rows.map((r) => r.trackId))) {
      await this.music.enqueueTrack(trackId);
    }
    return { ok: true as const, domain: "music" as const, requeued: count };
  }

  private async requeueWatch(where: { status: string; id?: { in: string[] } }) {
    if (!this.watch) throw new BadRequestException("Watch enrichment unavailable");
    const rows = latestPerEntity(
      await this.prisma.titleEnrichmentJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: REQUEUE_ALL_FAILED_LIMIT,
        select: { id: true, titleId: true },
      }),
      (r) => r.titleId,
    );
    if (!rows.length) return { ok: true as const, domain: "watch" as const, requeued: 0 };
    const { count } = await this.prisma.titleEnrichmentJob.updateMany({
      where: { id: { in: rows.map((r) => r.id) }, status: "failed" },
      data: { status: "pending", lastError: null, completedAt: null },
    });
    for (const titleId of new Set(rows.map((r) => r.titleId))) {
      this.watch.enqueueTitle(titleId, { force: true });
    }
    return { ok: true as const, domain: "watch" as const, requeued: count };
  }
}
