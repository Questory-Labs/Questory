import { Controller, Post, UseGuards } from "@nestjs/common";
import { SteamAuthGuard, type SessionUser } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { CollectionsService } from "../collections/collections.service";
import { EnterpriseProxyService } from "./enterprise-proxy.service";
import { EnterpriseRateLimitService } from "./enterprise-rate-limit.service";

@Controller("recommendations/clusters")
@UseGuards(SteamAuthGuard)
export class EnterpriseClustersController {
  constructor(
    private readonly proxy: EnterpriseProxyService,
    private readonly rateLimit: EnterpriseRateLimitService,
    private readonly collections: CollectionsService,
  ) {}

  @Post("collections")
  async rebuild(@CurrentUser() user: SessionUser) {
    await this.rateLimit.assertAllowed(user.userId, "recommendations");
    const response = await this.proxy.forward<{ clusters?: unknown; available?: boolean }>({
      userId: user.userId,
      isAdmin: false,
      method: "GET",
      path: "/v1/enterprise/clusters",
    });
    if (!response?.available) return { available: false, collections: 0 };
    const collections = await this.collections.applyClusterCollections(
      user.userId,
      response.clusters,
    );
    return { available: true, collections };
  }
}
