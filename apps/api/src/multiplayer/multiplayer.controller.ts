import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from "@nestjs/common";
import { MultiplayerService } from "./multiplayer.service";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { MultiplayerPlanRequestSchema } from "@questorylabs/shared";

@Controller("multiplayer")
@UseGuards(SteamAuthGuard)
export class MultiplayerController {
  constructor(private readonly multiplayer: MultiplayerService) {}

  @Post("plan")
  plan(
    @CurrentUser() user: { userId: string },
    @Body() body: unknown,
  ) {
    const parsed = MultiplayerPlanRequestSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const data = parsed.data;
    const minPlayers = Math.min(data.minPlayers, data.maxPlayers);
    const maxPlayers = Math.max(data.minPlayers, data.maxPlayers);
    const minYear = Math.min(data.minYear, data.maxYear);
    const maxYear = Math.max(data.minYear, data.maxYear);
    return this.multiplayer.plan(user.userId, {
      friendSteamIds: data.friendSteamIds || [],
      minPlayers,
      maxPlayers,
      minYear,
      maxYear,
      mode: data.mode,
      genre: data.genre || undefined,
      sortBy: data.sortBy,
      suggested: Boolean(data.suggested),
      strictLibraryMatching: Boolean(data.strictLibraryMatching),
      controller: data.controller,
      steamDeck: data.steamDeck,
    });
  }
}
