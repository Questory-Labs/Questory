import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { SearchService } from "./search.service";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

@Controller("search")
@UseGuards(SteamAuthGuard)
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  query(
    @CurrentUser() user: { userId: string },
    @Query("q") q = "",
  ) {
    return this.search.search(user.userId, q);
  }
}
