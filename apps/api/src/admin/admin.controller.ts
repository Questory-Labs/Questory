import {
  BadRequestException,
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
import { AdminUserOpsService } from "./admin-user-ops.service";
import { MigrationsService } from "./migrations/migrations.service";

const PatchSettingsSchema = z.object({
  signupEnabled: z.boolean().optional(),
  requireEmailVerification: z.boolean().optional(),
  features: z
    .object({
      recommendations: z.boolean().optional(),
      rewindAi: z.boolean().optional(),
    })
    .optional(),
});

const CreateUserSchema = z.object({
  personaName: z.string().min(1).max(64),
  email: z.string().email(),
  password: z.string().min(10).max(128),
});

const PatchUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(10).max(128).optional(),
  isAdmin: z.boolean().optional(),
  personaName: z.string().min(1).max(64).optional(),
  disabled: z.boolean().optional(),
});

const PatchUserEntitlementSchema = z.object({
  feature: z.enum(["recommendations", "rewindAi"]),
  enabled: z.boolean(),
});

const TriggerCronSchema = z.object({
  jobName: z.enum([
    "daily-refresh",
    "recover-failed-sync",
    "watch-sync",
    "catalog-sync",
    "price-sync",
    "trakt-sync",
    "anilist-sync",
    "mal-sync",
    "kitsu-sync",
    "bangumi-sync",
    "shikimori-sync",
  ]),
});

const TriggerEnrichmentSchema = z.object({
  action: z.enum(["catalog-sync", "recover-failed-sync"]),
});

const EnrichmentQuerySchema = z.object({
  domain: z.enum(["music", "watch", "game"]).default("music"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15),
  status: z
    .enum(["all", "pending", "running", "completed", "failed"])
    .default("all"),
});

const CronRunsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const OpsUserSchema = z.object({
  userId: z.string().min(1),
});

const OpsUserTargetSchema = z.object({
  userId: z.string().min(1),
  target: z.enum(["music", "movie", "read", "catalog", "price"]),
});

@Controller("admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly adminUserOps: AdminUserOpsService,
    private readonly migrations: MigrationsService,
  ) {}

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

  @Post("users")
  createUser(@Body() body: unknown) {
    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.admin.createUser(parsed.data);
  }

  @Patch("users/:id")
  patchUser(@Param("id") id: string, @Body() body: unknown) {
    const parsed = PatchUserSchema.safeParse(body);
    if (!parsed.success) {
      return { error: "Invalid body" };
    }
    return this.admin.patchUser(id, parsed.data);
  }

  @Patch("users/:id/entitlements")
  patchUserEntitlements(@Param("id") id: string, @Body() body: unknown) {
    const parsed = PatchUserEntitlementSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.admin.setUserEntitlement(
      id,
      parsed.data.feature,
      parsed.data.enabled,
    );
  }

  @Delete("users/:id")
  deleteUser(@Param("id") id: string) {
    return this.admin.deleteUser(id);
  }

  @Post("users/:id/reset-data")
  resetUserData(@Param("id") id: string) {
    return this.admin.resetUserData(id);
  }

  @Get("cron/runs")
  cronRuns(@Query("page") page?: string, @Query("pageSize") pageSize?: string) {
    const parsed = CronRunsQuerySchema.safeParse({ page, pageSize });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.admin.listCronRuns(parsed.data);
  }

  @Get("cron/status")
  cronStatus() {
    return this.admin.cronStatus();
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
  enrichment(
    @Query("domain") domain?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("status") status?: string,
  ) {
    const parsed = EnrichmentQuerySchema.safeParse({
      domain,
      page,
      pageSize,
      status,
    });
    if (!parsed.success) {
      return { error: "Invalid query" };
    }
    return this.admin.enrichmentOverview(parsed.data);
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

  @Post("ops/user-sync-target")
  userSyncTarget(@Body() body: unknown) {
    const parsed = OpsUserTargetSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.adminUserOps.syncTarget(
      parsed.data.userId,
      parsed.data.target,
    );
  }

  @Get("migrations")
  listMigrations() {
    return this.migrations.listMigrations();
  }

  @Post("migrations/:key/run")
  runMigration(
    @Param("key") key: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.migrations.runMigration(key, user.userId);
  }
}
