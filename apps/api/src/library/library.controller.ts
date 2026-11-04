import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  LibrarySortSchema,
  LibraryStatusFilterSchema,
  LibraryStatusUpdateSchema,
} from "@questorylabs/shared";
import { LibraryService } from "./library.service";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

@Controller("library")
@UseGuards(SteamAuthGuard)
export class LibraryController {
  constructor(private readonly library: LibraryService) {}

  @Get()
  list(
    @CurrentUser() user: { userId: string },
    @Query("q") q?: string,
    @Query("genre") genre?: string,
    @Query("tag") tag?: string,
    @Query("store") store?: string,
    @Query("minPlaytime") minPlaytime?: string,
    @Query("maxPlaytime") maxPlaytime?: string,
    @Query("unplayed") unplayed?: string,
    @Query("multiplayer") multiplayer?: string,
    @Query("singleplayer") singleplayer?: string,
    @Query("coop") coop?: string,
    @Query("pvp") pvp?: string,
    @Query("deck") deck?: string,
    @Query("controller") controller?: string,
    @Query("publisher") publisher?: string,
    @Query("developer") developer?: string,
    @Query("sort") sortRaw?: string,
    @Query("status") statusRaw?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    const sort = sortRaw ? LibrarySortSchema.safeParse(sortRaw) : null;
    if (sort && !sort.success) throw new BadRequestException("Invalid sort");
    const status = statusRaw
      ? LibraryStatusFilterSchema.safeParse(statusRaw)
      : null;
    if (status && !status.success) {
      throw new BadRequestException("Invalid status");
    }
    return this.library.list(user.userId, {
      q,
      genre,
      tag,
      store,
      minPlaytime: minPlaytime ? Number(minPlaytime) : undefined,
      maxPlaytime: maxPlaytime ? Number(maxPlaytime) : undefined,
      unplayed: unplayed === "true",
      multiplayer: multiplayer === "true",
      singleplayer: singleplayer === "true",
      coop: coop === "true",
      pvp: pvp === "true",
      deck: deck === "true",
      controller: controller === "true",
      publisher,
      developer,
      sort: sort?.data,
      status: status?.data,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 24,
    });
  }

  @Get(":id")
  async getOne(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    // Canonical game id, or numeric Steam appId for back-compat
    if (/^\d+$/.test(id)) {
      return this.library.getOneByAppId(user.userId, Number(id));
    }
    return this.library.getOne(user.userId, id);
  }

  @Patch(":id/status")
  async updateStatus(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const parsed = LibraryStatusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const gameId = /^\d+$/.test(id)
      ? (await this.library.getOneByAppId(user.userId, Number(id)))?.game.id
      : id;
    if (!gameId) throw new NotFoundException("Game not in your library");
    return this.library.setStatus(user.userId, gameId, parsed.data.status);
  }

  @Patch(":id/price")
  updatePrice(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Body() body: { pricePaid: number; purchasedAt?: string },
  ) {
    const gameIdPromise = /^\d+$/.test(id)
      ? this.library.getOneByAppId(user.userId, Number(id)).then((e) => e?.game.id)
      : Promise.resolve(id);
    return gameIdPromise.then((gameId) => {
      if (!gameId) return null;
      return this.library.updatePrice(
        user.userId,
        gameId,
        body.pricePaid,
        body.purchasedAt,
      );
    });
  }
}
