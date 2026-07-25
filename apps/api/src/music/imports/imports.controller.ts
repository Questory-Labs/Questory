import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { randomUUID } from "crypto";
import { mkdirSync } from "fs";
import { rm } from "fs/promises";
import { diskStorage } from "multer";
import { join } from "path";
import { CurrentMusicUser } from "../auth/current-music-user.decorator";
import { SessionUserGuard } from "../auth/session-user.guard";
import { ImportsService } from "./imports.service";
import type { ImportSource } from "./parsers/types";
import { resolveRepoTempDir } from "./temp-dir";

const SOURCES: ImportSource[] = [
  "koito_db",
  "koito_json",
  "spotify_json",
  "maloja_json",
  "lastfm_json",
  "listenbrainz_zip",
];

@Controller("music/imports")
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  @Post()
  @UseGuards(SessionUserGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(
            resolveRepoTempDir(),
            "music-uploads",
            randomUUID(),
          );
          try {
            mkdirSync(dir, { recursive: true });
            cb(null, dir);
          } catch (err) {
            cb(err as Error, dir);
          }
        },
        filename: (_req, file, cb) => {
          const name = (file.originalname || "import.bin").replace(
            /[/\\]/g,
            "_",
          );
          cb(null, name);
        },
      }),
      limits: { fileSize: 120 * 1024 * 1024 },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentMusicUser() user: { userId: string },
    @Query("source") sourceRaw?: string,
  ) {
    if (!file?.path) {
      throw new BadRequestException(
        "Upload an import file as multipart field `file`",
      );
    }
    const name = (file.filename || file.originalname || "import.bin").replace(
      /[/\\]/g,
      "_",
    );
    let source: ImportSource | undefined;
    if (sourceRaw) {
      if (!SOURCES.includes(sourceRaw as ImportSource)) {
        throw new BadRequestException(
          `Unknown source. Use one of: ${SOURCES.join(", ")}`,
        );
      }
      source = sourceRaw as ImportSource;
    }
    try {
      return await this.imports.startImport(
        file.path,
        name,
        user.userId,
        source,
      );
    } catch (err) {
      if (file.destination) {
        await rm(file.destination, { recursive: true, force: true }).catch(
          () => {},
        );
      }
      throw err;
    }
  }

  @Get("active")
  @UseGuards(SessionUserGuard)
  getActive(@CurrentMusicUser() user: { userId: string }) {
    return this.imports.getActiveJob(user.userId);
  }

  @Get(":jobId")
  @UseGuards(SessionUserGuard)
  getJob(
    @Param("jobId") jobId: string,
    @CurrentMusicUser() user: { userId: string },
  ) {
    return this.imports.getJob(jobId, user.userId);
  }
}
