import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  RewindShareCreateSchema,
  type RewindBadgeCreated,
  type RewindBadgeListResponse,
  type RewindShareCreated,
  type RewindShareDeleteResult,
  type RewindShareListResponse,
} from "@questorylabs/shared";
import { SteamAuthGuard, type SessionUser } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { RewindShareService } from "./rewind-share.service";

@Controller("rewind")
@UseGuards(SteamAuthGuard)
export class RewindShareController {
  constructor(private readonly shares: RewindShareService) {}

  @Post("shares")
  async create(
    @CurrentUser() user: SessionUser,
    @Body() body: unknown,
  ): Promise<RewindShareCreated> {
    const parsed = RewindShareCreateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Invalid share request");
    }
    return this.shares.createShare(user.userId, parsed.data);
  }

  @Get("shares")
  async list(@CurrentUser() user: SessionUser): Promise<RewindShareListResponse> {
    return { items: await this.shares.listShares(user.userId) };
  }

  @Delete("shares/:id")
  async revoke(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
  ): Promise<RewindShareDeleteResult> {
    await this.shares.revokeShare(user.userId, id);
    return { ok: true };
  }

  @Post("badges")
  async createBadge(@CurrentUser() user: SessionUser): Promise<RewindBadgeCreated> {
    return this.shares.createBadge(user.userId);
  }

  @Get("badges")
  async listBadges(@CurrentUser() user: SessionUser): Promise<RewindBadgeListResponse> {
    return { items: await this.shares.listBadges(user.userId) };
  }

  @Delete("badges/:id")
  async revokeBadge(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
  ): Promise<RewindShareDeleteResult> {
    await this.shares.revokeBadge(user.userId, id);
    return { ok: true };
  }
}
