import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import { INestApplication, VersioningType } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { StatusController } from "../../src/features/status.controller";
import { FeatureFlagsService } from "../../src/features/feature-flags.service";

describe("GET /v1/status", () => {
  let app: INestApplication;
  const getPublicStatus = vi.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [StatusController],
      providers: [
        {
          provide: FeatureFlagsService,
          useValue: { getPublicStatus },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: "1",
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns domain and source flags with no-store", async () => {
    getPublicStatus.mockResolvedValue({
      music: { enabled: true },
      watch: { enabled: false },
      read: { enabled: true },
      sources: { lastfm: true, anilist: false },
    });
    const res = await request(app.getHttpServer()).get("/v1/status").expect(200);
    expect(res.body.music.enabled).toBe(true);
    expect(res.body.watch.enabled).toBe(false);
    expect(res.headers["cache-control"]).toMatch(/no-store/);
  });
});
