import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { FamilyService } from "./family.service";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

@Controller("family")
@UseGuards(SteamAuthGuard)
export class FamilyController {
  constructor(private readonly family: FamilyService) {}

  @Get()
  get(@CurrentUser() user: { userId: string }) {
    return this.family.getGroup(user.userId);
  }

  @Post()
  create(@CurrentUser() user: { userId: string }) {
    return this.family.getOrCreate(user.userId);
  }

  @Post("members")
  addMember(
    @CurrentUser() user: { userId: string },
    @Body() body: { steamId: string },
  ) {
    return this.family.addMember(user.userId, body.steamId);
  }

  @Post("members/import")
  importFromFriends(
    @CurrentUser() user: { userId: string },
    @Body() body: { steamIds: string[] },
  ) {
    return this.family.importFromFriends(user.userId, body.steamIds || []);
  }

  @Get("insights")
  insights(@CurrentUser() user: { userId: string }) {
    return this.family.insights(user.userId);
  }

  @Get("library")
  library(
    @CurrentUser() user: { userId: string },
    @Query("memberSteamId") memberSteamId?: string,
    @Query("q") q?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.family.library(user.userId, {
      memberSteamId,
      q,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get("games/:appId")
  gameDetail(
    @CurrentUser() user: { userId: string },
    @Param("appId") appId: string,
  ) {
    return this.family.gameDetail(user.userId, Number(appId));
  }
}
