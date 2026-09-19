import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { randomUUID } from "crypto";
import { mkdirSync } from "fs";
import { diskStorage } from "multer";
import { join } from "path";
import type { Response } from "express";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { resolveRepoTempDir } from "../music/imports/temp-dir";
import { PROFILE_IMPORT_MAX_BYTES } from "./profile-data.constants";
import { ProfileExportService } from "./profile-export.service";
import { ProfileImportService } from "./profile-import.service";

@Controller("users")
@UseGuards(SteamAuthGuard)
export class ProfileDataController {
  constructor(
    private readonly exports: ProfileExportService,
    private readonly imports: ProfileImportService,
  ) {}

  @Post("me/export")
  startExport(@CurrentUser() user: { userId: string }) {
    return this.exports.enqueue(user.userId);
  }

  @Get("me/export")
  exportStatus(@CurrentUser() user: { userId: string }) {
    return this.exports.getStatus(user.userId);
  }

  @Get("me/export/file")
  @Header("Content-Type", "application/zip")
  async exportFile(
    @CurrentUser() user: { userId: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { stream, fileName } = await this.exports.openFile(user.userId);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName.replace(/"/g, "")}"`,
    );
    return new StreamableFile(stream);
  }

  @Get("me/import/active")
  importActive(@CurrentUser() user: { userId: string }) {
    return this.imports.getActive(user.userId);
  }

  @Post("me/import")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(
            resolveRepoTempDir(),
            "profile-imports",
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
          const name = (file.originalname || "profile.zip").replace(
            /[/\\]/g,
            "_",
          );
          cb(null, name);
        },
      }),
      limits: { fileSize: PROFILE_IMPORT_MAX_BYTES },
    }),
  )
  startImport(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: { userId: string },
  ) {
    if (!file?.path) {
      throw new BadRequestException(
        "Upload a Questory profile zip as multipart field `file`",
      );
    }
    const name = (file.originalname || file.filename || "profile.zip").replace(
      /[/\\]/g,
      "_",
    );
    return this.imports.startImport(user.userId, file.path, name);
  }
}
