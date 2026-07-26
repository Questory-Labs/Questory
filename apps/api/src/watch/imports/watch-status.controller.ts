import { Controller, Get, UseGuards } from "@nestjs/common";
import { SessionUserGuard } from "../auth/session-user.guard";
import { CurrentWatchUserId } from "../auth/current-watch-user.decorator";
import { LetterboxdService } from "./letterboxd.service";
import { TraktService } from "../trakt/trakt.service";
import { AnilistService } from "../anilist/anilist.service";

@Controller("watch")
export class WatchStatusController {
  constructor(
    private readonly letterboxd: LetterboxdService,
    private readonly trakt: TraktService,
    private readonly anilist: AnilistService,
  ) {}

  /**
   * Aggregate Watch activity for the shell status bar:
   * Letterboxd import job + Trakt/AniList in-flight sync flags.
   */
  @Get("sync-status")
  @UseGuards(SessionUserGuard)
  async syncStatus(@CurrentWatchUserId() userId: string) {
    const [letterboxd, trakt, anilist] = await Promise.all([
      this.letterboxd.getActiveJob(userId),
      this.trakt.getConnection(userId),
      this.anilist.getConnection(userId),
    ]);

    const traktSyncing = Boolean(trakt?.connected && trakt.syncing);
    const anilistSyncing = Boolean(anilist?.connected && anilist.syncing);
    const active = Boolean(letterboxd || traktSyncing || anilistSyncing);

    return {
      active,
      letterboxd,
      trakt: trakt
        ? {
            connected: trakt.connected,
            syncing: Boolean(trakt.syncing),
            lastSyncedAt: trakt.lastSyncedAt ?? null,
          }
        : { connected: false, syncing: false, lastSyncedAt: null },
      anilist: anilist
        ? {
            connected: anilist.connected,
            syncing: Boolean(anilist.syncing),
            lastSyncedAt: anilist.lastSyncedAt ?? null,
          }
        : { connected: false, syncing: false, lastSyncedAt: null },
    };
  }
}
