import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  WatchCatalogLogSchema,
  WatchCatalogSearchQuerySchema,
} from "@questorylabs/shared";
import { CurrentWatchUserId } from "../auth/current-watch-user.decorator";
import { SessionUserGuard } from "../auth/session-user.guard";
import { ManualService } from "./manual.service";

@Controller("watch/catalog")
@UseGuards(SessionUserGuard)
export class WatchManualController {
  constructor(private readonly manual: ManualService) {}

  @Get("search")
  search(@Query() query: unknown) {
    const parsed = WatchCatalogSearchQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.manual.search(parsed.data.q);
  }

  @Post("log")
  log(@CurrentWatchUserId() userId: string, @Body() body: unknown) {
    const parsed = WatchCatalogLogSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.manual.log(userId, parsed.data);
  }
}
