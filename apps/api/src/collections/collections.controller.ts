import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { parsePageParam, parsePageSizeParam } from "@questorylabs/shared";
import { z } from "zod";
import { COLLECTION_GAMES_PAGE_SIZE } from "./collections.constants";
import { CollectionsService } from "./collections.service";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

const CreateCollectionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
});

const UpdateCollectionSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
});

const AddGameSchema = z.object({
  appId: z.number().int().positive(),
});

@Controller("collections")
@UseGuards(SteamAuthGuard)
export class CollectionsController {
  constructor(private readonly collections: CollectionsService) {}

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.collections.list(user.userId);
  }

  @Get(":id")
  getOne(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Query("page") pageRaw?: string,
    @Query("pageSize") pageSizeRaw?: string,
  ) {
    const page = parsePageParam(pageRaw, 1);
    const pageSize = parsePageSizeParam(
      pageSizeRaw,
      COLLECTION_GAMES_PAGE_SIZE,
    );
    if (page == null || pageSize == null) {
      throw new BadRequestException("Invalid page or pageSize");
    }
    return this.collections.getOne(user.userId, id, { page, pageSize });
  }

  @Post()
  create(
    @CurrentUser() user: { userId: string },
    @Body() body: unknown,
  ) {
    const parsed = CreateCollectionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.collections.createCustom(
      user.userId,
      parsed.data.name,
      parsed.data.description,
    );
  }

  @Patch(":id")
  update(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const parsed = UpdateCollectionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.collections.updateCustom(user.userId, id, parsed.data);
  }

  @Delete(":id")
  remove(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.collections.removeCustom(user.userId, id);
  }

  @Post(":id/games")
  addGame(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const parsed = AddGameSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.collections.addGame(user.userId, id, parsed.data.appId);
  }
}
