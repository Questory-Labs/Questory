import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ScraperIterationBodySchema,
  ScraperTestRequestSchema,
} from "@questorylabs/shared";
import { AdminGuard } from "../auth/admin.guard";
import { ScraperProvidersService } from "./scraper-providers.service";

@Controller("admin/scrapers")
@UseGuards(AdminGuard)
export class ScraperAdminController {
  constructor(private readonly providers: ScraperProvidersService) {}

  @Get("providers")
  listProviders() {
    return this.providers.listProviders();
  }

  @Get("providers/:key")
  getProvider(@Param("key") key: string) {
    return this.providers.getProviderDetail(key);
  }

  @Patch("providers/:key")
  patchProvider(
    @Param("key") key: string,
    @Body() body: { enabled?: boolean },
  ) {
    if (typeof body.enabled !== "boolean") {
      throw new BadRequestException("enabled must be a boolean");
    }
    return this.providers.setProviderEnabled(key, body.enabled);
  }

  @Post("providers/:key/iterations")
  createDraft(@Param("key") key: string) {
    return this.providers.createDraftIteration(key);
  }

  @Patch("providers/:key/iterations/:id")
  updateIteration(
    @Param("key") key: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const parsed = ScraperIterationBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.providers.updateIteration(key, id, parsed.data);
  }

  @Post("providers/:key/iterations/:id/test")
  testIteration(
    @Param("key") key: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const parsed = ScraperTestRequestSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.providers.testIteration(key, id, parsed.data);
  }

  @Post("providers/:key/iterations/:id/validate")
  validateIteration(
    @Param("key") key: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const parsed = ScraperTestRequestSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.providers.validateIteration(key, id, parsed.data);
  }

  @Post("providers/:key/iterations/:id/publish")
  publishIteration(@Param("key") key: string, @Param("id") id: string) {
    return this.providers.publishIteration(key, id);
  }

  @Delete("providers/:key/iterations/:id")
  discardIteration(@Param("key") key: string, @Param("id") id: string) {
    return this.providers.discardOpenIteration(key, id);
  }
}
