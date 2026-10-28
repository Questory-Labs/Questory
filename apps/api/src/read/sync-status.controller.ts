import { Controller, Get, UseGuards } from "@nestjs/common";
import { AnilistService } from "../watch/anilist/anilist.service";
import { BangumiService } from "../watch/bangumi/bangumi.service";
import { KitsuService } from "../watch/kitsu/kitsu.service";
import { MalService } from "../watch/mal/mal.service";
import { ShikimoriService } from "../watch/shikimori/shikimori.service";
import { ReadSessionUserGuard } from "./auth/session-user.guard";
import { CurrentReadUserId } from "./auth/current-read-user.decorator";

type ConnectionState = {
  connected: boolean;
  syncing?: boolean;
  lastSyncedAt?: string | null;
} | null;

function summarize(conn: ConnectionState) {
  return conn
    ? {
        connected: conn.connected,
        syncing: Boolean(conn.syncing),
        lastSyncedAt: conn.lastSyncedAt ?? null,
      }
    : { connected: false, syncing: false, lastSyncedAt: null };
}

@Controller("read")
export class ReadSyncStatusController {
  constructor(
    private readonly anilist: AnilistService,
    private readonly mal: MalService,
    private readonly kitsu: KitsuService,
    private readonly bangumi: BangumiService,
    private readonly shikimori: ShikimoriService,
  ) {}

  @Get("sync-status")
  @UseGuards(ReadSessionUserGuard)
  async syncStatus(@CurrentReadUserId() userId: string) {
    const [anilist, mal, kitsu, bangumi, shikimori] = await Promise.all([
      this.anilist.getConnection(userId),
      this.mal.getConnection(userId),
      this.kitsu.getConnection(userId),
      this.bangumi.getConnection(userId),
      this.shikimori.getConnection(userId),
    ]);
    const providers = {
      anilist: summarize(anilist),
      mal: summarize(mal),
      kitsu: summarize(kitsu),
      bangumi: summarize(bangumi),
      shikimori: summarize(shikimori),
    };
    return {
      active: Object.values(providers).some((p) => p.connected && p.syncing),
      ...providers,
    };
  }
}
