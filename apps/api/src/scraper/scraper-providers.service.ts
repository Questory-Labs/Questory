import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  renderScraperTemplate,
  ScraperDefinitionSchema,
  ScraperIterationBodySchema,
  type ScraperDefinition,
  type ScraperIterationRecord,
  type ScraperMacroContext,
  type ScraperProviderDetail,
  type ScraperProviderSummary,
  type ScraperTestRequest,
  type ScraperTestResponse,
} from "@questorylabs/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ScraperEngineService } from "./scraper-engine.service";
import {
  getScraperProviderRegistry,
  listScraperProviderRegistry,
} from "./scraper-providers-registry";

type IterationRow = {
  id: string;
  providerId: string;
  version: number;
  status: string;
  label: string | null;
  configJson: string;
  validatedAt: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  provider?: { key: string };
};

@Injectable()
export class ScraperProvidersService {
  private readonly logger = new Logger(ScraperProvidersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: ScraperEngineService,
  ) {}

  listRegistry() {
    return listScraperProviderRegistry();
  }

  private toIterationRecord(
    row: IterationRow,
    providerKey: string,
  ): ScraperIterationRecord {
    return {
      id: row.id,
      providerKey,
      version: row.version,
      status: row.status as ScraperIterationRecord["status"],
      label: row.label,
      config: ScraperDefinitionSchema.parse(JSON.parse(row.configJson)),
      validatedAt: row.validatedAt?.toISOString() ?? null,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async ensureProvider(key: string) {
    const registry = getScraperProviderRegistry(key);
    if (!registry) {
      throw new NotFoundException(`Unknown scraper provider: ${key}`);
    }

    let provider = await this.prisma.scraperProvider.findUnique({
      where: { key },
      include: {
        iterations: { orderBy: { version: "desc" } },
      },
    });

    if (!provider) {
      provider = await this.prisma.scraperProvider.create({
        data: {
          key: registry.key,
          label: registry.label,
          description: registry.description,
          enabled: true,
        },
        include: {
          iterations: { orderBy: { version: "desc" } },
        },
      });

      const published = await this.prisma.scraperIteration.create({
        data: {
          providerId: provider.id,
          version: 1,
          status: "published",
          label: "Initial",
          configJson: JSON.stringify(registry.defaultConfig),
          publishedAt: new Date(),
        },
      });
      this.logger.log(
        `Seeded scraper provider ${key} with published iteration v${published.version}`,
      );
      provider.iterations = [published];
    }

    return provider;
  }

  async listProviders(): Promise<ScraperProviderSummary[]> {
    const registry = listScraperProviderRegistry();
    const summaries: ScraperProviderSummary[] = [];

    for (const entry of registry) {
      const provider = await this.ensureProvider(entry.key);
      const iterations = await this.prisma.scraperIteration.findMany({
        where: { providerId: provider.id },
        select: { status: true },
      });
      summaries.push({
        key: provider.key,
        label: provider.label,
        description: provider.description,
        enabled: provider.enabled,
        hasPublished: iterations.some((row) => row.status === "published"),
        hasOpenIteration: iterations.some(
          (row) => row.status === "draft" || row.status === "validated",
        ),
      });
    }

    return summaries;
  }

  async getProviderDetail(key: string): Promise<ScraperProviderDetail> {
    const provider = await this.ensureProvider(key);
    const iterations = await this.prisma.scraperIteration.findMany({
      where: { providerId: provider.id },
      orderBy: { version: "desc" },
    });

    const records = iterations.map((row) =>
      this.toIterationRecord(row, provider.key),
    );
    const current =
      records.find((row) => row.status === "published") ?? null;
    const openIteration =
      records.find(
        (row) => row.status === "draft" || row.status === "validated",
      ) ?? null;
    const previous = records.filter((row) => row.status === "archived");

    return {
      key: provider.key,
      label: provider.label,
      description: provider.description,
      enabled: provider.enabled,
      hasPublished: current !== null,
      hasOpenIteration: openIteration !== null,
      current,
      previous,
      openIteration,
    };
  }

  async setProviderEnabled(key: string, enabled: boolean) {
    await this.ensureProvider(key);
    await this.prisma.scraperProvider.update({
      where: { key },
      data: { enabled },
    });
    return this.getProviderDetail(key);
  }

  async getPublishedDefinition(
    providerKey: string,
  ): Promise<ScraperDefinition | null> {
    const provider = await this.prisma.scraperProvider.findUnique({
      where: { key: providerKey },
    });
    if (!provider?.enabled) return null;

    const iteration = await this.prisma.scraperIteration.findFirst({
      where: { providerId: provider.id, status: "published" },
      orderBy: { version: "desc" },
    });
    if (!iteration) return null;

    return ScraperDefinitionSchema.parse(JSON.parse(iteration.configJson));
  }

  async createDraftIteration(key: string): Promise<ScraperProviderDetail> {
    const provider = await this.ensureProvider(key);
    const open = await this.prisma.scraperIteration.findFirst({
      where: {
        providerId: provider.id,
        status: { in: ["draft", "validated"] },
      },
    });
    if (open) {
      throw new BadRequestException(
        "An open iteration already exists. Finish or discard it before starting another.",
      );
    }

    const registry = getScraperProviderRegistry(key)!;
    const published = await this.prisma.scraperIteration.findFirst({
      where: { providerId: provider.id, status: "published" },
      orderBy: { version: "desc" },
    });
    const latest = await this.prisma.scraperIteration.findFirst({
      where: { providerId: provider.id },
      orderBy: { version: "desc" },
    });
    const nextVersion = (latest?.version ?? 0) + 1;
    const baseConfig = published
      ? ScraperDefinitionSchema.parse(JSON.parse(published.configJson))
      : registry.defaultConfig;

    await this.prisma.scraperIteration.create({
      data: {
        providerId: provider.id,
        version: nextVersion,
        status: "draft",
        label: `v${nextVersion} draft`,
        configJson: JSON.stringify(baseConfig),
      },
    });

    return this.getProviderDetail(key);
  }

  async updateIteration(
    providerKey: string,
    iterationId: string,
    body: unknown,
  ): Promise<ScraperIterationRecord> {
    const parsed = ScraperIterationBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const provider = await this.ensureProvider(providerKey);
    const iteration = await this.prisma.scraperIteration.findFirst({
      where: { id: iterationId, providerId: provider.id },
    });
    if (!iteration) {
      throw new NotFoundException("Iteration not found");
    }
    if (iteration.status !== "draft" && iteration.status !== "validated") {
      throw new BadRequestException("Only draft or validated iterations can be edited");
    }

    const row = await this.prisma.scraperIteration.update({
      where: { id: iterationId },
      data: {
        label: parsed.data.label ?? iteration.label,
        configJson: JSON.stringify(parsed.data.config),
        status: "draft",
        validatedAt: null,
      },
    });

    return this.toIterationRecord(row, provider.key);
  }

  async validateIteration(
    providerKey: string,
    iterationId: string,
    input: ScraperTestRequest,
  ): Promise<{ iteration: ScraperIterationRecord; test: ScraperTestResponse }> {
    const provider = await this.ensureProvider(providerKey);
    const iteration = await this.prisma.scraperIteration.findFirst({
      where: { id: iterationId, providerId: provider.id },
    });
    if (!iteration) {
      throw new NotFoundException("Iteration not found");
    }
    if (iteration.status !== "draft" && iteration.status !== "validated") {
      throw new BadRequestException("Only draft iterations can be validated");
    }

    const test = await this.testIterationConfig(
      ScraperDefinitionSchema.parse(JSON.parse(iteration.configJson)),
      input,
    );
    if (!test.pages.length) {
      throw new BadRequestException(
        "Validation failed: scrape returned no pages. Check URL, selectors, and macros.",
      );
    }

    const row = await this.prisma.scraperIteration.update({
      where: { id: iterationId },
      data: { status: "validated", validatedAt: new Date() },
    });

    return {
      iteration: this.toIterationRecord(row, provider.key),
      test,
    };
  }

  async publishIteration(
    providerKey: string,
    iterationId: string,
  ): Promise<ScraperProviderDetail> {
    const provider = await this.ensureProvider(providerKey);
    const iteration = await this.prisma.scraperIteration.findFirst({
      where: { id: iterationId, providerId: provider.id },
    });
    if (!iteration) {
      throw new NotFoundException("Iteration not found");
    }
    if (iteration.status !== "validated") {
      throw new BadRequestException(
        "Only validated iterations can be published. Run validate first.",
      );
    }

    await this.prisma.$transaction([
      this.prisma.scraperIteration.updateMany({
        where: { providerId: provider.id, status: "published" },
        data: { status: "archived" },
      }),
      this.prisma.scraperIteration.update({
        where: { id: iterationId },
        data: { status: "published", publishedAt: new Date() },
      }),
    ]);

    return this.getProviderDetail(providerKey);
  }

  async discardOpenIteration(
    providerKey: string,
    iterationId: string,
  ): Promise<ScraperProviderDetail> {
    const provider = await this.ensureProvider(providerKey);
    const iteration = await this.prisma.scraperIteration.findFirst({
      where: { id: iterationId, providerId: provider.id },
    });
    if (!iteration) {
      throw new NotFoundException("Iteration not found");
    }
    if (iteration.status !== "draft" && iteration.status !== "validated") {
      throw new BadRequestException("Only open iterations can be discarded");
    }

    await this.prisma.scraperIteration.delete({ where: { id: iterationId } });
    return this.getProviderDetail(providerKey);
  }

  async testIteration(
    providerKey: string,
    iterationId: string,
    input: ScraperTestRequest,
  ): Promise<ScraperTestResponse> {
    const provider = await this.ensureProvider(providerKey);
    const iteration = await this.prisma.scraperIteration.findFirst({
      where: { id: iterationId, providerId: provider.id },
    });
    if (!iteration) {
      throw new NotFoundException("Iteration not found");
    }

    return this.testIterationConfig(
      ScraperDefinitionSchema.parse(JSON.parse(iteration.configJson)),
      input,
    );
  }

  private async testIterationConfig(
    config: ScraperDefinition,
    input: ScraperTestRequest,
  ): Promise<ScraperTestResponse> {
    const macros = this.buildMacroContext(input.macros);
    const maxPages = input.maxPages ?? 1;
    const pages: ScraperTestResponse["pages"] = [];

    await this.engine.run(config, macros, {
      maxPages,
      onPage: async (rows, page, url) => {
        pages.push({ page, url, rows });
        return "continue";
      },
    });

    return { pages };
  }

  buildMacroContext(macros: Record<string, string>): ScraperMacroContext {
    const ctx: ScraperMacroContext = { page: 1 };
    for (const [key, value] of Object.entries(macros)) {
      if (key.startsWith("user.")) {
        ctx[key] = value;
      } else {
        ctx[`user.${key}`] = value;
        ctx[key] = value;
      }
    }
    return ctx;
  }

  resolveUrl(
    definition: ScraperDefinition,
    macros: ScraperMacroContext,
    page: number,
  ): string {
    const ctx = { ...macros, page };
    if (definition.pagination.type === "urlTemplate") {
      return renderScraperTemplate(definition.pagination.urlTemplate, ctx);
    }
    return renderScraperTemplate(definition.startUrl, ctx);
  }
}
