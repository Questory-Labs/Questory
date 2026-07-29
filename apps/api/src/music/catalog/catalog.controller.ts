import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";
import {
  MusicAlbumUpdateSchema,
  MusicArtistUpdateSchema,
  MusicTrackUpdateSchema,
} from "@questorylabs/shared";
import { SessionUserGuard } from "../auth/session-user.guard";
import { CatalogService } from "./catalog.service";

@Controller("music/catalog")
@UseGuards(SessionUserGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Patch("artists/:id")
  updateArtist(@Param("id") id: string, @Body() body: unknown) {
    const parsed = MusicArtistUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.catalog.updateArtist(id, parsed.data);
  }

  @Patch("albums/:id")
  updateAlbum(@Param("id") id: string, @Body() body: unknown) {
    const parsed = MusicAlbumUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.catalog.updateAlbum(id, parsed.data);
  }

  @Patch("tracks/:id")
  updateTrack(@Param("id") id: string, @Body() body: unknown) {
    const parsed = MusicTrackUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.catalog.updateTrack(id, parsed.data);
  }
}
