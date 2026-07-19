import {
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
import { z } from "zod";
import { AdminGuard } from "../auth/admin.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AdminService } from "./admin.service";

const PatchSettingsSchema = z.object({
  signupEnabled: z.boolean().optional(),
});

const PatchUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(10).max(128).optional(),
  isAdmin: z.boolean().optional(),
  personaName: z.string().min(1).max(64).optional(),
});

const TriggerCronSchema = z.object({
  jobName: z.enum([
    "daily-refresh",
    "recover-failed-sync",
    "catalog-sync",
    "trakt-sync",
    "anilist-sync",
  ]),
});

const TriggerEnrichmentSchema = z.object({
  action: z.enum(["catalog-sync", "recover-failed-sync"]),
});

const OpsUserSchema = z.object({
  userId: z.string().min(1),
});

@Controller("admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("overview")
  overview() {
    return this.admin.overview();
  }

  @Get("settings")
  settings() {
    return this.admin.getSettings();
  }

  @Patch("settings")
  patchSettings(@Body() body: unknown) {
    const parsed = PatchSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return { error: "Invalid body" };
    }
    return this.admin.patchSettings(parsed.data);
  }

  @Get("users")
  users() {
    return this.admin.listUsers();
  }

  @Patch("users/:id")
  patchUser(@Param("id") id: string, @Body() body: unknown) {
    const parsed = PatchUserSchema.safeParse(body);
    if (!parsed.success) {
      return { error: "Invalid body" };
    }
    return this.admin.patchUser(id, parsed.data);
  }

  @Delete("users/:id")
  deleteUser(@Param("id") id: string) {
    return this.admin.deleteUser(id);
  }

  @Get("cron/runs")
  cronRuns(@Query("take") take?: string) {
    return this.admin.listCronRuns(take ? Number(take) : 50);
  }

  @Post("cron/trigger")
  triggerCron(
    @Body() body: unknown,
    @CurrentUser() user: { userId: string },
  ) {
    const parsed = TriggerCronSchema.safeParse(body);
    if (!parsed.success) {
      return { error: "Invalid body" };
    }
    return this.admin.triggerCron(parsed.data.jobName, user.userId);
  }

  @Get("enrichment")
  enrichment() {
    return this.admin.enrichmentOverview();
  }

  @Post("enrichment/trigger")
  triggerEnrichment(
    @Body() body: unknown,
    @CurrentUser() user: { userId: string },
  ) {
    const parsed = TriggerEnrichmentSchema.safeParse(body);
    if (!parsed.success) {
      return { error: "Invalid body" };
    }
    return this.admin.triggerEnrichment(parsed.data.action, user.userId);
  }

  @Post("ops/refresh-prices")
  refreshPrices(@Body() body: unknown) {
    const parsed = OpsUserSchema.safeParse(body);
    if (!parsed.success) {
      return { error: "Invalid body" };
    }
    return this.admin.refreshPricesForUser(parsed.data.userId);
  }

  @Post("ops/user-sync")
  userSync(@Body() body: unknown) {
    const parsed = OpsUserSchema.safeParse(body);
    if (!parsed.success) {
      return { error: "Invalid body" };
    }
    return this.admin.syncUser(parsed.data.userId);
  }
}
