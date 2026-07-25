import {
  BadRequestException,
  Controller,
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

@Controller("watch/imports")
export class ImportsController {
  constructor(private readonly letterboxd: LetterboxdService) {}

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
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException(
        "Upload a Letterboxd diary CSV as multipart field `file`",
      );
    }
    const name = (file.originalname || "diary.csv").replace(/[/\\]/g, "_");
    const text = file.buffer.toString("utf8");
    return this.letterboxd.importDiaryCsv(text, userId, name);
  }
}
