import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { SteamAuthGuard, type SessionUser } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { EnterpriseProxyService } from "./enterprise-proxy.service";
import { EnterpriseRateLimitService } from "./enterprise-rate-limit.service";

@Controller("enterprise")
@UseGuards(SteamAuthGuard)
export class EnterpriseSettingsController {
  constructor(
    private readonly proxy: EnterpriseProxyService,
    private readonly rateLimit: EnterpriseRateLimitService,
  ) {}

  @Get("dossier")
  dossier(@CurrentUser() user: SessionUser) {
    return this.proxy.forward({
      userId: user.userId,
      isAdmin: false,
      method: "GET",
      path: "/v1/enterprise/dossier",
    });
  }

  @Post("dossier/refresh")
  async refreshDossier(@CurrentUser() user: SessionUser) {
    await this.rateLimit.assertAllowed(user.userId, "llm");
    return this.proxy.forward({
      userId: user.userId,
      isAdmin: false,
      method: "POST",
      path: "/v1/enterprise/dossier/refresh",
    });
  }

  @Get("settings")
  getSettings(@CurrentUser() user: SessionUser) {
    return this.proxy.forward({
      userId: user.userId,
      isAdmin: false,
      method: "GET",
      path: "/v1/enterprise/settings",
    });
  }

  @Put("settings")
  putSettings(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    return this.proxy.forward({
      userId: user.userId,
      isAdmin: false,
      method: "PUT",
      path: "/v1/enterprise/settings",
      body,
    });
  }
}
