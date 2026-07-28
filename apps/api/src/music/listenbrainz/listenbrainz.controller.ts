import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  VERSION_NEUTRAL,
} from "@nestjs/common";
import { ListenBrainzService } from "./listenbrainz.service";
import {
  AuthedRequest,
  TokenGuard,
  extractToken,
} from "./token.guard";

@Controller({
  path: ["1", "apis/listenbrainz/1"],
  version: VERSION_NEUTRAL,
})
export class ListenBrainzController {
  constructor(private readonly lb: ListenBrainzService) {}

  @Get("validate-token")
  async validateToken(@Req() req: AuthedRequest) {
    return this.lb.validateToken(extractToken(req));
  }

  @Post("submit-listens")
  @UseGuards(TokenGuard)
  async submitListens(
    @Req() req: AuthedRequest,
    @Body() body: unknown,
  ) {
    return this.lb.submitListens(req.musicUser!.id, body as any);
  }

  @Get("user/:user/listens")
  async listens(
    @Param("user") user: string,
    @Query("max_ts") maxTs?: string,
    @Query("min_ts") minTs?: string,
    /** Multi-scrobbler range aliases (mapped to min_ts / max_ts). */
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("count") count?: string,
  ) {
    const min = minTs ?? from;
    const max = maxTs ?? to;
    const result = await this.lb.getListens(user, {
      maxTs: max != null && max !== "" ? Number(max) : undefined,
      minTs: min != null && min !== "" ? Number(min) : undefined,
      count: count != null && count !== "" ? Number(count) : undefined,
    });
    if (!result) throw new NotFoundException({ error: "User not found" });
    return result;
  }

  @Get("user/:user/listen-count")
  async listenCount(@Param("user") user: string) {
    const result = await this.lb.getListenCount(user);
    if (!result) throw new NotFoundException({ error: "User not found" });
    return result;
  }

  @Get("user/:user/playing-now")
  async playingNow(@Param("user") user: string) {
    const result = await this.lb.getPlayingNow(user);
    if (!result) throw new NotFoundException({ error: "User not found" });
    return result;
  }
}
