import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { WishlistService } from "./wishlist.service";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

@Controller("wishlist")
@UseGuards(SteamAuthGuard)
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) {}

  @Get()
  list(
    @CurrentUser() user: { userId: string },
    @Query("store") store?: string,
  ) {
    return this.wishlist.list(user.userId, store);
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
