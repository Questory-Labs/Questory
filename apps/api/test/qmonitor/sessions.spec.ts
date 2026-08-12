import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { INestApplication, VersioningType } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import {
  SESSION_COOKIE_NAME,
  encodeSessionCookie,
} from "@questorylabs/shared/session";
import { QmonitorSessionsController } from "../../src/qmonitor/qmonitor-sessions.controller";
import { QmonitorSessionsService } from "../../src/qmonitor/qmonitor-sessions.service";
import { PrismaService } from "../../src/prisma/prisma.service";

describe("play-sessions list", () => {
  let app: INestApplication;
  const secret = "test-session-secret-32chars!!";
  const userId = "user-sessions-1";

  const endedAt = new Date("2026-01-01T01:00:00.000Z");
  const startedAt = new Date("2026-01-01T00:00:00.000Z");

  const prismaMock = {
    playSession: {
      count: async ({ where }: { where: { userId: string } }) =>
        where.userId === userId ? 1 : 0,
      findMany: async ({
        where,
        skip,
        take,
      }: {
        where: { userId: string };
        skip: number;
        take: number;
      }) => {
        if (where.userId !== userId || skip >= 1) return [];
        return [
          {
            id: "ps1",
            title: "Dota 2",
            source: "steam",
            appId: 570,
            gameId: "g1",
            startedAt,
            endedAt,
            durationSecs: 3600,
            exe: "dota2.exe",
            hostOs: "windows",
            hostName: "pc",
            game: {
              id: "g1",
              name: "Dota 2",
              headerImage: "https://example.com/h.jpg",
              appId: 570,
            },
          },
        ].slice(0, take);
      },
    },
  };

  beforeAll(async () => {
    process.env.SESSION_SECRET = secret;
    const moduleRef = await Test.createTestingModule({
      controllers: [QmonitorSessionsController],
      providers: [
        QmonitorSessionsService,
        { provide: PrismaService, useValue: prismaMock },
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

  it("rejects unauthenticated requests", async () => {
    await request(app.getHttpServer()).get("/v1/play-sessions").expect(401);
  });

  it("rejects invalid page params", async () => {
    const cookie = `${SESSION_COOKIE_NAME}=${encodeSessionCookie(
      { userId, steamId: "76561198000000000" },
      secret,
    )}`;
    await request(app.getHttpServer())
      .get("/v1/play-sessions?page=0")
      .set("Cookie", cookie)
      .expect(400);
  });

  it("returns paginated sessions for the signed-in user", async () => {
    const cookie = `${SESSION_COOKIE_NAME}=${encodeSessionCookie(
      { userId, steamId: "76561198000000000" },
      secret,
    )}`;
    const res = await request(app.getHttpServer())
      .get("/v1/play-sessions?page=1&pageSize=15")
      .set("Cookie", cookie)
      .expect(200);

    expect(res.body).toEqual({
      total: 1,
      page: 1,
      pageSize: 15,
      items: [
        {
          id: "ps1",
          title: "Dota 2",
          source: "steam",
          appId: 570,
          gameId: "g1",
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          durationSecs: 3600,
          exe: "dota2.exe",
          hostOs: "windows",
          hostName: "pc",
          game: {
            id: "g1",
            name: "Dota 2",
            headerImage: "https://example.com/h.jpg",
            appId: 570,
          },
        },
      ],
    });
  });
});
