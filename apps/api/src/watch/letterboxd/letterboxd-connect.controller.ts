import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Post,
  Body,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { SessionUserGuard } from "../auth/session-user.guard";
import { CurrentWatchUserId } from "../auth/current-watch-user.decorator";
import { LetterboxdConnectService } from "./letterboxd-connect.service";

const ConnectSchema = z.object({
  username: z.string().min(1).max(64),
});

@Controller("watch/letterboxd")
export class LetterboxdConnectController {
  constructor(private readonly connect: LetterboxdConnectService) {}

  @Get("status")
  @UseGuards(SessionUserGuard)
  status(@CurrentWatchUserId() userId: string) {
    return this.connect.getStatus(userId);
  }

  @Post("connect")
  @UseGuards(SessionUserGuard)
  connectUser(
    @CurrentWatchUserId() userId: string,
    @Body() body: unknown,
  ) {
    const parsed = ConnectSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.connect.connect(userId, parsed.data.username);
  }

  @Delete("connect")
  @UseGuards(SessionUserGuard)
  disconnect(@CurrentWatchUserId() userId: string) {
    return this.connect.disconnect(userId);
  }
}
