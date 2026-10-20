import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Logger,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { SteamAuthGuard } from "../auth/auth.guard";
import { AdminGuard } from "../auth/admin.guard";
import { CronRunnerService } from "../cron/cron-runner.service";
import { MonthlyRecapService } from "./monthly-recap.service";

function readEnabled(body: unknown, field: string): boolean {
  const value = (body as Record<string, unknown> | null)?.[field];
  if (typeof value !== "boolean") {
    throw new BadRequestException(`${field} must be a boolean`);
  }
  return value;
}

@Controller("recap")
export class RecapController {
  private readonly logger = new Logger(RecapController.name);

  constructor(
    private readonly recap: MonthlyRecapService,
    private readonly cronRunner: CronRunnerService,
  ) {}

  @Get("settings")
  @UseGuards(SteamAuthGuard)
  getSettings(@Req() req: Request) {
    return this.recap.getUserSetting((req as any).userId);
  }

  @Put("settings")
  @UseGuards(SteamAuthGuard)
  putSettings(@Req() req: Request, @Body() body: unknown) {
    return this.recap.setUserSetting((req as any).userId, readEnabled(body, "monthly"));
  }

  @Put("admin/global")
  @UseGuards(AdminGuard)
  async putGlobal(@Body() body: unknown) {
    const enabled = readEnabled(body, "enabled");
    await this.recap.setGlobal(enabled);
    return { enabled };
  }

  @Post("admin/run")
  @UseGuards(AdminGuard)
  @HttpCode(202)
  runNow(@Req() req: Request) {
    if (this.recap.running) throw new ConflictException("Monthly recap is already running");
    void this.cronRunner
      .run("monthly-recap", "admin", () => this.recap.run(), { userId: (req as any).userId })
      .then(({ result }) => this.logger.log(`monthly-recap done: ${JSON.stringify(result)}`))
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`monthly-recap failed: ${message}`);
      });
    return { started: true };
  }
}
