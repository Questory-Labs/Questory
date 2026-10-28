import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from "@nestjs/common";
import { TasteClusterSaveSchema } from "@questorylabs/shared";
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

  private async fetchClusters(userId: string) {
    await this.rateLimit.assertAllowed(userId, "recommendations");
    return this.proxy.forward<{ clusters?: unknown; available?: boolean }>({
      userId,
      isAdmin: false,
      method: "GET",
      path: "/v1/enterprise/clusters",
    });
  }

  @Get("preview")
  async preview(@CurrentUser() user: SessionUser) {
    const response = await this.fetchClusters(user.userId);
    if (!response?.available) return { available: false, clusters: [] };
    const clusters = await this.collections.previewClusters(
      user.userId,
      response.clusters,
    );
    return { available: true, clusters };
  }

  @Post("save")
  async saveOne(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    const parsed = TasteClusterSaveSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const response = await this.fetchClusters(user.userId);
    if (!response?.available) return { available: false, saved: false };
    const result = await this.collections.saveCluster(
      user.userId,
      response.clusters,
      parsed.data.clusterId,
    );
    return { available: true, ...result };
  }

  @Post("collections")
  async rebuild(@CurrentUser() user: SessionUser) {
    const response = await this.fetchClusters(user.userId);
    if (!response?.available) return { available: false, collections: 0 };
    const collections = await this.collections.applyClusterCollections(
      user.userId,
      response.clusters,
    );
    return { available: true, collections };
  }
}
