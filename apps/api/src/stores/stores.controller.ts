import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { StoresService } from "./stores.service";
import { SyncService } from "../sync/sync.service";
import { isStoreId } from "./store.constants";

@Controller()
export class StoresController {
  constructor(
    private readonly stores: StoresService,
    private readonly sync: SyncService,
  ) {}

  @Get("stores")
  @UseGuards(SteamAuthGuard)
  list(@CurrentUser() user: { userId: string }) {
    return this.stores.listStatus(user.userId);
  }

  @Delete("stores/:store")
  @UseGuards(SteamAuthGuard)
  unlink(
    @CurrentUser() user: { userId: string },
    @Param("store") store: string,
  ) {
    return this.stores.unlink(user.userId, store);
  }

  @Post("stores/:store/sync")
  @UseGuards(SteamAuthGuard)
  async resync(
    @CurrentUser() user: { userId: string; steamId: string | null },
    @Param("store") store: string,
  ) {
    if (!isStoreId(store)) return { ok: false, error: "invalid_store" };
    if (store !== "steam") {
      return {
        ok: false,
        error: "coming_later",
        message: "Live sync for this store is not available yet.",
      };
    }
    if (!user.steamId) {
      return { ok: false, error: "steam_not_linked" };
    }
    await this.sync.enqueue(user.userId, user.steamId, "library-sync");
    await this.sync.enqueue(user.userId, user.steamId, "wishlist-sync");
    return { ok: true };
  }
}
