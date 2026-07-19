import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { INestApplication, VersioningType } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { InternalController } from "../../src/internal/internal.controller";
import { TraktService } from "../../src/trakt/trakt.service";
import { AnilistService } from "../../src/anilist/anilist.service";

describe("watch internal cron", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.CRON_SECRET = "cron-test-secret";
    const moduleRef = await Test.createTestingModule({
      controllers: [InternalController],
      providers: [
        {
          provide: TraktService,
          useValue: { syncHistory: async () => ({ ok: true }) },
        },
        {
          provide: AnilistService,
          useValue: { syncList: async () => ({ ok: true }) },
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

  it("requires cron secret", async () => {
    await request(app.getHttpServer())
      .post("/v1/internal/cron/trakt-sync")
      .expect(401);
  });

  it("rejects wrong secret", async () => {
    await request(app.getHttpServer())
      .post("/v1/internal/cron/trakt-sync")
      .set("Authorization", "Bearer wrong")
      .expect(401);
  });

  it("accepts valid bearer", async () => {
    await request(app.getHttpServer())
      .post("/v1/internal/cron/trakt-sync")
      .set("Authorization", "Bearer cron-test-secret")
      .expect(201);
  });
});
