import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { LetterboxdService } from "./letterboxd.service";
import { SessionUserGuard } from "../auth/session-user.guard";
import { CurrentWatchUserId } from "../auth/current-watch-user.decorator";
import { parseIncludeKinds } from "./letterboxd-zip";

@Controller("watch/imports")
export class ImportsController {
  constructor(private readonly letterboxd: LetterboxdService) {}

  @Get("active")
  @UseGuards(SessionUserGuard)
  getActive(@CurrentWatchUserId() userId: string) {
    return this.letterboxd.getActiveJob(userId);
  }

  @Post("letterboxd")
  @UseGuards(SessionUserGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async letterboxdImport(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentWatchUserId() userId: string,
    @Body("include") includeRaw?: string,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException(
        "Upload a Letterboxd export zip or CSV as multipart field `file`",
      );
    }
    const name = (file.originalname || "letterboxd.zip").replace(/[/\\]/g, "_");
    const include = parseIncludeKinds(includeRaw);
    return this.letterboxd.importUpload({
      buffer: file.buffer,
      fileName: name,
      include,
      userId,
    });
  }
}
