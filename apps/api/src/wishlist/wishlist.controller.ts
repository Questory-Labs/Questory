import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { parsePageParam, parsePageSizeParam } from "@questorylabs/shared";
import { WishlistService } from "./wishlist.service";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { WISHLIST_PAGE_SIZE } from "./wishlist.constants";

@Controller("wishlist")
@UseGuards(SteamAuthGuard)
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) {}

  @Get()
  list(
    @CurrentUser() user: { userId: string },
    @Query("store") store?: string,
    @Query("page") pageRaw?: string,
    @Query("pageSize") pageSizeRaw?: string,
  ) {
    const page = parsePageParam(pageRaw, 1);
    const pageSize = parsePageSizeParam(pageSizeRaw, WISHLIST_PAGE_SIZE);
    if (page == null || pageSize == null) {
      throw new BadRequestException("Invalid page or pageSize");
    }
    return this.wishlist.list(user.userId, store, { page, pageSize });
  }

  @Get("recommendations")
  recommendations(@CurrentUser() user: { userId: string }) {
    return this.wishlist.recommendations(user.userId);
  }

  @Get("deals")
  deals(@CurrentUser() user: { userId: string }) {
    return this.wishlist.dealAlerts(user.userId);
  }

  @Patch(":store/:externalId")
  setTargetByStore(
    @CurrentUser() user: { userId: string },
    @Param("store") store: string,
    @Param("externalId") externalId: string,
    @Body() body: { targetPrice: number | null },
  ) {
    return this.wishlist.setTargetPrice(
      user.userId,
      store,
      externalId,
      body.targetPrice,
    );
  }

  @Patch(":appId")
  setTarget(
    @CurrentUser() user: { userId: string },
    @Param("appId") appId: string,
    @Body() body: { targetPrice: number | null },
  ) {
    return this.wishlist.setTargetPriceByAppId(
      user.userId,
      Number(appId),
      body.targetPrice,
    );
  }
}
