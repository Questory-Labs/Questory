import { Injectable } from "@nestjs/common";
import type { EntitlementFeature, UserEntitlements } from "@questorylabs/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";
import { isQuestoryCloud } from "../lib/runtime-config";
import { isEffectiveAdmin } from "../auth/admin-emails";
import { providerFetch } from "../lib/qhttp-outbound";

export const FEATURE_CONFIG_PREFIX = "feature.";

@Injectable()
export class EntitlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async isInstanceFeatureOn(feature: EntitlementFeature): Promise<boolean> {
    const row = await this.prisma.appConfig.findUnique({
      where: { key: `${FEATURE_CONFIG_PREFIX}${feature}` },
    });
    if (!row) return true;
    return row.value === "on" || row.value === "true";
  }

  async setInstanceFeature(
    feature: EntitlementFeature,
    on: boolean,
  ): Promise<void> {
    const key = `${FEATURE_CONFIG_PREFIX}${feature}`;
    await this.prisma.appConfig.upsert({
      where: { key },
      create: { key, value: on ? "on" : "off" },
      update: { value: on ? "on" : "off" },
    });
  }

  async getInstanceFlags(): Promise<UserEntitlements> {
    const [recommendations, rewindAi] = await Promise.all([
      this.isInstanceFeatureOn("recommendations"),
      this.isInstanceFeatureOn("rewindAi"),
    ]);
    return { recommendations, rewindAi };
  }

  async setUserEntitlement(
    userId: string,
    feature: EntitlementFeature,
    enabled: boolean,
  ): Promise<void> {
    if (enabled) {
      await this.prisma.userEntitlement.upsert({
        where: { userId_feature: { userId, feature } },
        create: { userId, feature },
        update: {},
      });
      return;
    }
    await this.prisma.userEntitlement.deleteMany({
      where: { userId, feature },
    });
  }

  async resolveForUser(userId: string): Promise<UserEntitlements> {
    const [recommendations, rewindAi] = await Promise.all([
      this.isAllowed(userId, "recommendations"),
      this.isAllowed(userId, "rewindAi"),
    ]);
    return { recommendations, rewindAi };
  }

  async isAllowed(
    userId: string,
    feature: EntitlementFeature,
  ): Promise<boolean> {
    if (!(await this.isInstanceFeatureOn(feature))) return false;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isAdmin: true },
    });
    if (!user) return false;
    if (isEffectiveAdmin(user)) return true;

    if (!isQuestoryCloud()) {
      return this.isQEngineAvailable();
    }

    const grant = await this.prisma.userEntitlement.findUnique({
      where: { userId_feature: { userId, feature } },
    });
    return Boolean(grant);
  }

  async grantsMap(
    userIds: string[],
  ): Promise<Map<string, UserEntitlements>> {
    const rows = await this.prisma.userEntitlement.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, feature: true },
    });
    const map = new Map<string, UserEntitlements>();
    for (const id of userIds) {
      map.set(id, { recommendations: false, rewindAi: false });
    }
    for (const row of rows) {
      const current = map.get(row.userId);
      if (!current) continue;
      if (row.feature === "recommendations") current.recommendations = true;
      if (row.feature === "rewindAi") current.rewindAi = true;
    }
    return map;
  }

  async isQEngineAvailable(): Promise<boolean> {
    const cached = await this.cache.getJson<boolean>("entitlements:qengine");
    if (typeof cached === "boolean") return cached;
    const base = (process.env.ENTERPRISE_URL || "http://127.0.0.1:4030").replace(
      /\/$/,
      "",
    );
    try {
      const res = await providerFetch(`${base}/v1/enterprise/status`, {
        cache: "no-store",
      });
      let available = false;
      if (res.ok) {
        const body = (await res.json()) as { available?: boolean };
        available = body.available === true;
      }
      await this.cache.setJson("entitlements:qengine", available, 30);
      return available;
    } catch {
      await this.cache.setJson("entitlements:qengine", false, 15);
      return false;
    }
  }
}
