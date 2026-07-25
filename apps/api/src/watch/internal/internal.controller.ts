import {
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import { TraktService } from "../trakt/trakt.service";
import { AnilistService } from "../anilist/anilist.service";

function safeStringEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

@Controller("watch/internal/cron")
export class InternalController {
  constructor(
    private readonly trakt: TraktService,
    private readonly anilist: AnilistService,
  ) {}

  private assertCron(auth?: string) {
    const secret = (process.env.CRON_SECRET || "").trim();
    if (!secret) throw new UnauthorizedException("CRON_SECRET unset");
    const token = auth?.replace(/^Bearer\s+/i, "").trim() || "";
    if (!token || !safeStringEqual(token, secret)) {
      throw new UnauthorizedException("Invalid cron secret");
    }
  }

  @Post("trakt-sync")
  async traktSync(@Headers("authorization") auth?: string) {
    this.assertCron(auth);
    return this.trakt.syncHistory();
  }

  @Post("anilist-sync")
  async anilistSync(@Headers("authorization") auth?: string) {
    this.assertCron(auth);
    return this.anilist.syncList();
  }
}
