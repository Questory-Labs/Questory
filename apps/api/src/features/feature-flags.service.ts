import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import {
  FEATURE_DOMAINS,
  FEATURE_SOURCES,
  featureDisabledMessage,
  type AdminDomainFlags,
  type AdminSourceFlags,
  type AppStatus,
  type FeatureDomain,
  type FeatureFlagOrigin,
  type FeatureSource,
  type FlagWithOrigin,
  type SourceFlags,
} from "@questorylabs/shared";
import { PrismaService } from "../prisma/prisma.service";
import {
  FEATURE_FLAGS_TTL_MS,
  featureConfigKey,
  sourceConfigKey,
} from "./features.constants";

export type ResolvedFlags = {
  domains: AdminDomainFlags;
  sources: AdminSourceFlags;
};

function parseEnvBool(raw: string | undefined): boolean | undefined {
  if (raw == null) return undefined;
  const v = raw.trim().toLowerCase();
  if (!v) return undefined;
  if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
  if (v === "false" || v === "0" || v === "no" || v === "off") return false;
  return undefined;
}

function domainEnvNames(domain: FeatureDomain): [string, string] {
  const upper = domain.toUpperCase();
  return [`FEATURE_${upper}`, `NEXT_PUBLIC_ENABLE_${upper}`];
}

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private snapshot: ResolvedFlags | null = null;
  private loadedAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  invalidate() {
    this.snapshot = null;
    this.loadedAt = 0;
  }

  async isDomainEnabled(domain: FeatureDomain): Promise<boolean> {
    const snap = await this.getSnapshot();
    return snap.domains[domain].enabled;
  }

  async isSourceEnabled(source: FeatureSource): Promise<boolean> {
    const snap = await this.getSnapshot();
    return snap.sources[source].enabled;
  }

  async assertDomainEnabled(domain: FeatureDomain): Promise<void> {
    if (!(await this.isDomainEnabled(domain))) {
      throw new ForbiddenException(featureDisabledMessage(domain));
    }
  }

  async assertSourceEnabled(source: FeatureSource): Promise<void> {
    if (!(await this.isSourceEnabled(source))) {
      throw new ForbiddenException(featureDisabledMessage(source));
    }
  }

  async getPublicStatus(): Promise<AppStatus> {
    const snap = await this.getSnapshot();
    const sources = {} as SourceFlags;
    for (const id of FEATURE_SOURCES) {
      sources[id] = snap.sources[id].enabled;
    }
    return {
      music: { enabled: snap.domains.music.enabled },
      watch: { enabled: snap.domains.watch.enabled },
      read: { enabled: snap.domains.read.enabled },
      sources,
    };
  }

  async getAdminFlags(): Promise<ResolvedFlags> {
    return this.getSnapshot();
  }

  async setDomain(domain: FeatureDomain, enabled: boolean): Promise<void> {
    await this.upsert(featureConfigKey(domain), enabled);
    this.patchL1("domain", domain, enabled);
  }

  async setSource(source: FeatureSource, enabled: boolean): Promise<void> {
    await this.upsert(sourceConfigKey(source), enabled);
    this.patchL1("source", source, enabled);
  }

  async getSnapshot(force = false): Promise<ResolvedFlags> {
    const fresh =
      this.snapshot &&
      !force &&
      Date.now() - this.loadedAt < FEATURE_FLAGS_TTL_MS;
    if (fresh && this.snapshot) return this.snapshot;

    try {
      const rows = await this.prisma.appConfig.findMany({
        where: {
          OR: [
            { key: { startsWith: "feature." } },
            { key: { startsWith: "source." } },
          ],
        },
      });
      const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
      this.snapshot = this.resolve(map);
      this.loadedAt = Date.now();
      return this.snapshot;
    } catch (err) {
      this.logger.warn(
        `Feature flags DB read failed: ${err instanceof Error ? err.message : err}`,
      );
      if (this.snapshot) return this.snapshot;
      this.snapshot = this.resolve({});
      this.loadedAt = Date.now();
      return this.snapshot;
    }
  }

  private async upsert(key: string, enabled: boolean) {
    await this.prisma.appConfig.upsert({
      where: { key },
      create: { key, value: enabled ? "true" : "false" },
      update: { value: enabled ? "true" : "false" },
    });
  }

  private patchL1(
    kind: "domain" | "source",
    id: FeatureDomain | FeatureSource,
    enabled: boolean,
  ) {
    if (!this.snapshot) {
      this.snapshot = this.resolve({});
    }
    const flag: FlagWithOrigin = { enabled, origin: "db" };
    if (kind === "domain") {
      this.snapshot.domains[id as FeatureDomain] = flag;
    } else {
      this.snapshot.sources[id as FeatureSource] = flag;
    }
    this.loadedAt = Date.now();
  }

  private resolve(map: Record<string, string>): ResolvedFlags {
    const domains = {} as AdminDomainFlags;
    for (const domain of FEATURE_DOMAINS) {
      domains[domain] = this.resolveDomain(domain, map[featureConfigKey(domain)]);
    }
    const sources = {} as AdminSourceFlags;
    for (const source of FEATURE_SOURCES) {
      sources[source] = this.resolveSource(map[sourceConfigKey(source)]);
    }
    return { domains, sources };
  }

  private resolveDomain(
    domain: FeatureDomain,
    stored: string | undefined,
  ): FlagWithOrigin {
    if (stored === "true" || stored === "false") {
      return { enabled: stored === "true", origin: "db" };
    }
    const [featureName, publicName] = domainEnvNames(domain);
    const fromFeature = parseEnvBool(process.env[featureName]);
    if (fromFeature !== undefined) {
      return { enabled: fromFeature, origin: "env" };
    }
    const fromPublic = parseEnvBool(process.env[publicName]);
    if (fromPublic !== undefined) {
      return { enabled: fromPublic, origin: "env" };
    }
    return { enabled: false, origin: "default" };
  }

  private resolveSource(stored: string | undefined): FlagWithOrigin {
    if (stored === "true" || stored === "false") {
      return { enabled: stored === "true", origin: "db" };
    }
    return { enabled: true, origin: "default" };
  }
}

export type { FeatureFlagOrigin };
