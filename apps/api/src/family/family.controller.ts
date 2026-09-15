import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import {
  FAMILY_MEMBER_LIMIT,
  parsePageParam,
  parsePageSizeParam,
  SteamId64Schema,
} from "@questorylabs/shared";
import { FamilyService } from "./family.service";
import { FamilyMembersService } from "./family-members.service";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { FAMILY_LIBRARY_PAGE_SIZE } from "./family.constants";

const AddMemberSchema = z.object({
  steamId: SteamId64Schema,
});

const ImportMembersSchema = z.object({
  steamIds: z.array(SteamId64Schema).max(FAMILY_MEMBER_LIMIT),
});

@Controller("family")
@UseGuards(SteamAuthGuard)
export class FamilyController {
  constructor(
    private readonly family: FamilyService,
    private readonly members: FamilyMembersService,
  ) {}

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
    @Body() body: unknown,
  ) {
    const parsed = AddMemberSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.members.addMember(user.userId, parsed.data.steamId);
  }

  @Post("members/import")
  importFromFriends(
    @CurrentUser() user: { userId: string },
    @Body() body: unknown,
  ) {
    const parsed = ImportMembersSchema.safeParse(body ?? { steamIds: [] });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.members.importFromFriends(user.userId, parsed.data.steamIds);
  }

  @Delete("members/:steamId")
  removeMember(
    @CurrentUser() user: { userId: string },
    @Param("steamId") steamId: string,
  ) {
    const parsed = SteamId64Schema.safeParse(steamId);
    if (!parsed.success) {
      throw new BadRequestException("SteamID64 must be a 17-digit number");
    }
    return this.members.removeMember(user.userId, parsed.data);
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
    @Query("overlapOnly") overlapOnly?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    const pageN = parsePageParam(page, 1);
    const pageSizeN = parsePageSizeParam(pageSize, FAMILY_LIBRARY_PAGE_SIZE);
    if (pageN == null || pageSizeN == null) {
      throw new BadRequestException("Invalid page or pageSize");
    }
    return this.family.library(user.userId, {
      memberSteamId,
      q,
      overlapOnly: overlapOnly === "true",
      page: pageN,
      pageSize: pageSizeN,
    });
  }

  @Get("games/:appId")
  gameDetail(
    @CurrentUser() user: { userId: string },
    @Param("appId") appId: string,
  ) {
    const n = Number(appId);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
      throw new BadRequestException("Invalid appId");
    }
    return this.family.gameDetail(user.userId, n);
  }
}
