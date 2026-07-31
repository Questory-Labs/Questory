import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";
import { SearchQuerySchema } from "@questorylabs/shared";
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
    @Query() query: unknown,
  ) {
    const parsed = SearchQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.search.search(user.userId, parsed.data.q, parsed.data.limit);
  }
}
