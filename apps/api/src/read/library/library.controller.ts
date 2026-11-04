import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  parsePageParam,
  parsePageSizeParam,
  ReadLibrarySortSchema,
  type ReadLibrarySort,
} from "@questorylabs/shared";

const READ_LIBRARY_GENRE_MAX = 64;
import { ReadSessionUserGuard } from "../auth/session-user.guard";
import { CurrentReadUserId } from "../auth/current-read-user.decorator";
import { ReadLibraryService } from "./library.service";

@Controller("read/library")
@UseGuards(ReadSessionUserGuard)
export class ReadLibraryController {
  constructor(private readonly library: ReadLibraryService) {}

  @Get()
  list(
    @CurrentReadUserId() userId: string,
    @Query("page") pageRaw?: string,
    @Query("pageSize") pageSizeRaw?: string,
    @Query("status") status?: string,
    @Query("format") format?: string,
    @Query("category") category?: string,
    @Query("q") q?: string,
    @Query("minScore") minScoreRaw?: string,
    @Query("genre") genreRaw?: string,
    @Query("sort") sortRaw?: string,
  ) {
    const page = parsePageParam(pageRaw, 1);
    const pageSize = parsePageSizeParam(pageSizeRaw, 40);
    if (page == null || pageSize == null) {
      throw new BadRequestException("Invalid page or pageSize");
    }
    let minScore: number | undefined;
    if (minScoreRaw != null && minScoreRaw !== "") {
      const n = Number(minScoreRaw);
      if (!Number.isFinite(n)) {
        throw new BadRequestException("Invalid minScore");
      }
      minScore = n;
    }
    let sort: ReadLibrarySort | undefined;
    if (sortRaw != null && sortRaw !== "") {
      const parsed = ReadLibrarySortSchema.safeParse(sortRaw);
      if (!parsed.success) throw new BadRequestException("Invalid sort");
      sort = parsed.data;
    }
    const genre = genreRaw?.trim() || undefined;
    if (genre && genre.length > READ_LIBRARY_GENRE_MAX) {
      throw new BadRequestException("Invalid genre");
    }
    return this.library.list(userId, {
      page,
      pageSize,
      status: status?.trim() || undefined,
      format: format?.trim() || undefined,
      category: category?.trim() || undefined,
      q,
      minScore,
      genre,
      sort,
    });
  }
}
