import { Controller, Get, UseGuards } from "@nestjs/common";
import { AnilistService } from "../watch/anilist/anilist.service";
import { ReadSessionUserGuard } from "./auth/session-user.guard";
import { CurrentReadUserId } from "./auth/current-read-user.decorator";

@Controller("read")
export class ReadSyncStatusController {
  constructor(private readonly anilist: AnilistService) {}

  @Get("sync-status")
  @UseGuards(ReadSessionUserGuard)
  async syncStatus(@CurrentReadUserId() userId: string) {
    const anilist = await this.anilist.getConnection(userId);
    const syncing = Boolean(anilist?.connected && anilist.syncing);
    return {
      active: syncing,
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
