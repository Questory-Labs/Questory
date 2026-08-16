import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { INestApplication, VersioningType } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import {
  SESSION_COOKIE_NAME,
  encodeSessionCookie,
} from "@questorylabs/shared/session";
import { SyncController } from "../../src/sync/sync.controller";
import { SyncService } from "../../src/sync/sync.service";
import { CatalogService } from "../../src/steam/catalog.service";
import { liveSessionPrismaProvider } from "../live-session-prisma";

describe("sync privilege", () => {
  let app: INestApplication;
  const secret = "test-session-secret-32chars!!";

  beforeAll(async () => {
    process.env.SESSION_SECRET = secret;
    const moduleRef = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [
        {
          provide: SyncService,
          useValue: {
            enqueueAll: async () => ({ ok: true }),
            latestJobs: async () => [],
          },
        },
        {
          provide: CatalogService,
          useValue: {
            getStatus: async () => ({ status: "idle" }),
            syncIncremental: async () => ({ ok: true }),
          },
        },
        liveSessionPrismaProvider(),
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: "1",
    });
    app.use(cookieParser(secret));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("forbids user-triggered global catalog sync", async () => {
    const cookie = encodeSessionCookie(
      { userId: "u1", steamId: "76561198000000000" },
      secret,
    );
    await request(app.getHttpServer())
      .post("/v1/sync/catalog")
      .set("Cookie", `${SESSION_COOKIE_NAME}=${cookie}`)
      .expect(403);
  });
});
