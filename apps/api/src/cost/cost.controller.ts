import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CostService } from "./cost.service";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

@Controller("cost")
@UseGuards(SteamAuthGuard)
export class CostController {
  constructor(private readonly cost: CostService) {}

  @Get("summary")
  summary(@CurrentUser() user: { userId: string }) {
    return this.cost.summary(user.userId);
  }

  @Get("roi")
  roi(@CurrentUser() user: { userId: string }) {
    return this.cost.roi(user.userId);
  }

  @Post("refresh-prices")
  refreshPrices(@CurrentUser() user: { userId: string }) {
    return this.cost.refreshPrices(user.userId);
  }
}
