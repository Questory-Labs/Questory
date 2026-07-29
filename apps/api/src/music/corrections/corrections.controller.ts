import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  MusicCatalogSuggestKindSchema,
  MusicCorrectionSaveSchema,
  MusicTrackMergeSchema,
} from "@questorylabs/shared";
import { SessionUserGuard } from "../auth/session-user.guard";
import { CurrentMusicUser } from "../auth/current-music-user.decorator";
import { CorrectionsService } from "./corrections.service";

@Controller("music")
@UseGuards(SessionUserGuard)
export class CorrectionsController {
  constructor(private readonly corrections: CorrectionsService) {}

  @Get("catalog/suggest")
  suggest(
    @CurrentMusicUser() user: { userId: string },
    @Query("kind") kind?: string,
    @Query("q") q?: string,
    @Query("limit") limit?: string,
  ) {
    const parsed = MusicCatalogSuggestKindSchema.safeParse(kind);
    if (!parsed.success) {
      throw new BadRequestException("Invalid kind");
    }
    const n = limit ? Number(limit) : 10;
    return this.corrections.suggest(
      user.userId,
      parsed.data,
      q ?? "",
      Number.isFinite(n) ? n : 10,
    );
  }

  @Get("corrections/tracks/:id")
  getTrackForm(
    @CurrentMusicUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.corrections.getTrackCorrectionForm(user.userId, id);
  }

  @Put("corrections/tracks/:id")
  saveTrack(
    @CurrentMusicUser() user: { userId: string },
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const parsed = MusicCorrectionSaveSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.corrections.saveTrackCorrection(user.userId, id, parsed.data);
  }

  @Post("corrections/tracks/:id/merge")
  mergeTrack(
    @CurrentMusicUser() user: { userId: string },
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const parsed = MusicTrackMergeSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.corrections.mergeTrackInto(
      user.userId,
      id,
      parsed.data.targetTrackId,
    );
  }

  @Get("corrections/albums/:id")
  getAlbumForm(
    @CurrentMusicUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.corrections.getAlbumCorrectionForm(user.userId, id);
  }

  @Put("corrections/albums/:id")
  saveAlbum(
    @CurrentMusicUser() user: { userId: string },
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const parsed = MusicCorrectionSaveSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.corrections.saveAlbumCorrection(user.userId, id, parsed.data);
  }

  @Get("corrections/artists/:id")
  getArtistForm(
    @CurrentMusicUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.corrections.getArtistCorrectionForm(user.userId, id);
  }

  @Put("corrections/artists/:id")
  saveArtist(
    @CurrentMusicUser() user: { userId: string },
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const parsed = MusicCorrectionSaveSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.corrections.saveArtistCorrection(user.userId, id, parsed.data);
  }

  @Delete("corrections/rules/:id")
  deleteRule(
    @CurrentMusicUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.corrections.deleteRule(user.userId, id);
  }
}
