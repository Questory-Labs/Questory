import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { AccountsService } from "../accounts/accounts.service";
import { CostService } from "../cost/cost.service";
import { EnrichmentService as MusicEnrichmentService } from "../music/enrichment/enrichment.service";
import { PrismaService } from "../prisma/prisma.service";
import { SyncService } from "../sync/sync.service";
import { AnilistService } from "../watch/anilist/anilist.service";
import { BangumiService } from "../watch/bangumi/bangumi.service";
import { KitsuService } from "../watch/kitsu/kitsu.service";
import { LetterboxdScrapeSyncService } from "../watch/letterboxd/letterboxd-scrape-sync.service";
import { MalService } from "../watch/mal/mal.service";
import { ShikimoriService } from "../watch/shikimori/shikimori.service";
import { TraktService } from "../watch/trakt/trakt.service";

export type AdminUserSyncTarget =
  | "music"
  | "movie"
  | "read"
  | "catalog"
  | "price";

@Injectable()
export class AdminUserOpsService {
  private readonly logger = new Logger(AdminUserOpsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
    private readonly sync: SyncService,
    private readonly cost: CostService,
    private readonly musicEnrichment: MusicEnrichmentService,
    private readonly trakt: TraktService,
    private readonly letterboxd: LetterboxdScrapeSyncService,
    private readonly anilist: AnilistService,
    private readonly mal: MalService,
    private readonly kitsu: KitsuService,
    private readonly bangumi: BangumiService,
    private readonly shikimori: ShikimoriService,
  ) {}

  async syncTarget(userId: string, target: AdminUserSyncTarget) {
    await this.requireUser(userId);

    switch (target) {
      case "catalog":
        return this.syncCatalog(userId);
      case "price":
        return this.syncPrice(userId);
      case "music":
        return this.syncMusic(userId);
      case "movie":
        return this.syncMovie(userId);
      case "read":
        return this.syncRead(userId);
      default:
        throw new BadRequestException(`Unknown sync target: ${target}`);
    }
  }

  private async requireUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException("User not found");
  }

  private async syncCatalog(userId: string) {
    const steamId = await this.accounts.getSteamId(userId);
    if (!steamId) {
      throw new BadRequestException("User has no linked Steam account");
    }
    return this.sync.enqueueAll(userId, steamId, { force: true });
  }

  private syncPrice(userId: string) {
    return this.cost.refreshPrices(userId);
  }

  private async syncMusic(userId: string) {
    const listens = await this.prisma.listen.findMany({
      where: { userId },
      select: { trackId: true },
      distinct: ["trackId"],
      take: 5000,
    });

    let enqueued = 0;
    for (const { trackId } of listens) {
      await this.musicEnrichment.enqueueTrack(trackId);
      enqueued += 1;
    }

    return { ok: true, enqueued, userId };
  }

  private async syncMovie(userId: string) {
    return this.runProviderSyncs(userId, [
      ["trakt", () => this.trakt.syncHistory(userId)],
      ["letterboxd", () => this.letterboxd.syncUser(userId)],
      ["anilist", () => this.anilist.syncList(userId)],
      ["mal", () => this.mal.syncList(userId)],
      ["kitsu", () => this.kitsu.syncList(userId)],
      ["bangumi", () => this.bangumi.syncList(userId)],
      ["shikimori", () => this.shikimori.syncList(userId)],
    ]);
  }

  private async syncRead(userId: string) {
    return this.runProviderSyncs(userId, [
      ["anilist", () => this.anilist.syncList(userId)],
      ["mal", () => this.mal.syncList(userId)],
      ["kitsu", () => this.kitsu.syncList(userId)],
      ["bangumi", () => this.bangumi.syncList(userId)],
      ["shikimori", () => this.shikimori.syncList(userId)],
    ]);
  }

  private async runProviderSyncs(
    userId: string,
    providers: Array<[string, () => Promise<unknown>]>,
  ) {
    const results: Record<string, unknown> = {};

    for (const [name, run] of providers) {
      try {
        results[name] = await run();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Admin sync ${name} failed for ${userId}: ${message}`);
        results[name] = { error: message };
      }
    }

    return { ok: true, userId, results };
  }
}
