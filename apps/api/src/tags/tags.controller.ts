import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { SteamAuthGuard } from "../auth/auth.guard";
import { isMediaTagType, TagsService } from "./tags.service";

const MediaQuerySchema = z.object({
  mediaType: z.string().min(1),
  mediaId: z.string().min(1),
});

const ReplaceTagsSchema = z.object({
  mediaType: z.enum([
    "steam_game",
    "music_track",
    "watch_title",
    "read_title",
  ]),
  mediaId: z.string().min(1),
  tags: z.array(z.string().trim().min(1).max(64)).max(40),
});

@Controller("tags")
@UseGuards(SteamAuthGuard)
export class TagsController {
  constructor(private readonly tags: TagsService) {}

  @Get()
  async list(
    @Query("mediaType") mediaTypeRaw?: string,
    @Query("mediaId") mediaIdRaw?: string,
  ) {
    const parsed = MediaQuerySchema.safeParse({
      mediaType: mediaTypeRaw,
      mediaId: mediaIdRaw,
    });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    if (!isMediaTagType(parsed.data.mediaType)) {
      throw new BadRequestException("Invalid mediaType");
    }
    return this.tags.listForMedia(parsed.data.mediaType, parsed.data.mediaId);
  }

  @Post("modify")
  async modify(@Body() body: unknown) {
    const parsed = ReplaceTagsSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.tags.replaceForMedia(
      parsed.data.mediaType,
      parsed.data.mediaId,
      parsed.data.tags,
    );
  }
}
