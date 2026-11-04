import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LETTERBOXD_SCRAPER_DEFINITION } from "../../src/scraper/letterboxd-default-config";
import { ScraperProvidersService } from "../../src/scraper/scraper-providers.service";

describe("ScraperProvidersService", () => {
  const prisma = {
    scraperProvider: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    scraperIteration: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
  };
  const engine = { run: vi.fn() };

  let service: ScraperProvidersService;

  const providerRow = {
    id: "prov-1",
    key: "letterboxd",
    label: "Letterboxd",
    description: "Diary scrape",
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    iterations: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ScraperProvidersService(prisma as never, engine as never);
  });

  it("lists registry providers", async () => {
    prisma.scraperProvider.findUnique.mockResolvedValue(null);
    prisma.scraperProvider.create.mockResolvedValue(providerRow);
    prisma.scraperIteration.create.mockResolvedValue({
      id: "iter-1",
      providerId: "prov-1",
      version: 1,
      status: "published",
      label: "Initial",
      configJson: JSON.stringify(LETTERBOXD_SCRAPER_DEFINITION),
      validatedAt: null,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.scraperIteration.findMany.mockResolvedValue([
      { status: "published" },
    ]);

    const list = await service.listProviders();
    expect(list.map((p) => p.key)).toContain("letterboxd");
  });

  it("summarises the published version per provider", async () => {
    prisma.scraperProvider.findUnique.mockResolvedValue(providerRow);
    const publishedAt = new Date("2026-10-12T10:00:00.000Z");
    prisma.scraperIteration.findMany.mockResolvedValue([
      { status: "draft", version: 4, publishedAt: null },
      { status: "published", version: 3, publishedAt },
      { status: "archived", version: 2, publishedAt: new Date() },
    ]);

    const [summary] = await service.listProviders();
    expect(summary).toMatchObject({
      key: "letterboxd",
      hasPublished: true,
      hasOpenIteration: true,
      publishedVersion: 3,
      publishedAt: publishedAt.toISOString(),
    });
  });

  it("returns null published version when nothing is published", async () => {
    prisma.scraperProvider.findUnique.mockResolvedValue(providerRow);
    prisma.scraperIteration.findMany.mockResolvedValue([
      { status: "draft", version: 1, publishedAt: null },
    ]);

    const [summary] = await service.listProviders();
    expect(summary.publishedVersion).toBeNull();
    expect(summary.publishedAt).toBeNull();
  });

  it("returns published definition when provider enabled", async () => {
    prisma.scraperProvider.findUnique.mockResolvedValue(providerRow);
    prisma.scraperIteration.findFirst.mockResolvedValue({
      configJson: JSON.stringify(LETTERBOXD_SCRAPER_DEFINITION),
    });

    const config = await service.getPublishedDefinition("letterboxd");
    expect(config?.engine).toBe("cheerio");
  });

  it("creates draft from published config", async () => {
    prisma.scraperProvider.findUnique.mockResolvedValue({
      ...providerRow,
      iterations: [],
    });
    prisma.scraperIteration.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "pub-1",
        version: 1,
        status: "published",
        configJson: JSON.stringify(LETTERBOXD_SCRAPER_DEFINITION),
      })
      .mockResolvedValueOnce({
        id: "pub-1",
        version: 1,
        status: "published",
      });
    prisma.scraperIteration.create.mockResolvedValue({
      id: "draft-1",
      providerId: "prov-1",
      version: 2,
      status: "draft",
      label: "v2 draft",
      configJson: JSON.stringify(LETTERBOXD_SCRAPER_DEFINITION),
      validatedAt: null,
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.scraperIteration.findMany.mockResolvedValue([
      {
        id: "pub-1",
        providerId: "prov-1",
        version: 1,
        status: "published",
        label: "Initial",
        configJson: JSON.stringify(LETTERBOXD_SCRAPER_DEFINITION),
        validatedAt: null,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "draft-1",
        providerId: "prov-1",
        version: 2,
        status: "draft",
        label: "v2 draft",
        configJson: JSON.stringify(LETTERBOXD_SCRAPER_DEFINITION),
        validatedAt: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const detail = await service.createDraftIteration("letterboxd");
    expect(detail.openIteration?.version).toBe(2);
    expect(prisma.scraperIteration.create).toHaveBeenCalled();
  });

  it("rejects publish without validation", async () => {
    prisma.scraperProvider.findUnique.mockResolvedValue({
      ...providerRow,
      iterations: [],
    });
    prisma.scraperIteration.findFirst.mockResolvedValue({
      id: "draft-1",
      providerId: "prov-1",
      version: 2,
      status: "draft",
      configJson: JSON.stringify(LETTERBOXD_SCRAPER_DEFINITION),
    });

    await expect(
      service.publishIteration("letterboxd", "draft-1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("throws for unknown provider", async () => {
    await expect(service.getProviderDetail("nope")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
