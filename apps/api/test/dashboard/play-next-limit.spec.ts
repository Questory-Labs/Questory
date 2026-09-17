import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { INestApplication, VersioningType } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import {
  SESSION_COOKIE_NAME,
  encodeSessionCookie,
} from "@questorylabs/shared/session";
import { DashboardController } from "../../src/dashboard/dashboard.controller";
import { DashboardService } from "../../src/dashboard/dashboard.service";
import { PLAY_NEXT_DEFAULT_LIMIT } from "../../src/dashboard/dashboard.constants";

describe("dashboard play-next limit", () => {
  let app: INestApplication;
  const secret = "test-session-secret-32chars!!";
  const playNext = vi.fn().mockResolvedValue([]);

  beforeAll(async () => {
    process.env.SESSION_SECRET = secret;
    const moduleRef = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: {
            playNext,
            getStats: vi.fn(),
          },
        },
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

  const cookie = () =>
    `${SESSION_COOKIE_NAME}=${encodeSessionCookie(
      { userId: "u1", steamId: "76561198000000000" },
      secret,
    )}`;

  it("defaults to the service cap when limit is omitted", async () => {
    playNext.mockClear();
    await request(app.getHttpServer())
      .get("/v1/dashboard/play-next")
      .set("Cookie", cookie())
      .expect(200);
    expect(playNext).toHaveBeenCalledWith("u1", PLAY_NEXT_DEFAULT_LIMIT);
  });

  it("forwards a parsed limit", async () => {
    playNext.mockClear();
    await request(app.getHttpServer())
      .get("/v1/dashboard/play-next?limit=3")
      .set("Cookie", cookie())
      .expect(200);
    expect(playNext).toHaveBeenCalledWith("u1", 3);
  });

  it("rejects a limit above the max", async () => {
    await request(app.getHttpServer())
      .get("/v1/dashboard/play-next?limit=999")
      .set("Cookie", cookie())
      .expect(400);
  });
});
