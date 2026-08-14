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
import { QmonitorSessionRulesService } from "../../src/qmonitor/qmonitor-session-rules.service";
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
      findFirst: async ({
        where,
      }: {
        where: { id: string; userId: string };
      }) =>
        where.userId === userId && where.id === "ps1"
          ? {
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
            }
          : null,
      findMany: async ({
        where,
        skip,
        take,
      }: {
        where: { userId: string };
        skip?: number;
        take?: number;
      }) => {
        if (where.userId !== userId) return [];
        if (typeof skip === "number" && skip >= 1) return [];
        const rows = [
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
        ];
        return typeof take === "number" ? rows.slice(0, take) : rows;
      },
      deleteMany: async ({
        where,
      }: {
        where: { id: string; userId: string };
      }) =>
        where.userId === userId && where.id === "ps1"
          ? { count: 1 }
          : { count: 0 },
    },
    libraryEntry: {
      findUnique: async () => null,
      findMany: async () => [],
    },
    userPlaySessionRule: {
      findMany: async () => [],
      upsert: async () => ({ id: "r1" }),
    },
  };

  beforeAll(async () => {
    process.env.SESSION_SECRET = secret;
    const moduleRef = await Test.createTestingModule({
      controllers: [QmonitorSessionsController],
      providers: [
        QmonitorSessionsService,
        QmonitorSessionRulesService,
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

  it("rejects assign without a gameId", async () => {
    const cookie = `${SESSION_COOKIE_NAME}=${encodeSessionCookie(
      { userId, steamId: "76561198000000000" },
      secret,
    )}`;
    await request(app.getHttpServer())
      .post("/v1/play-sessions/ps1/assign")
      .set("Cookie", cookie)
      .send({})
      .expect(400);
  });

  it("rejects assign when the game is not in the library", async () => {
    const cookie = `${SESSION_COOKIE_NAME}=${encodeSessionCookie(
      { userId, steamId: "76561198000000000" },
      secret,
    )}`;
    await request(app.getHttpServer())
      .post("/v1/play-sessions/ps1/assign")
      .set("Cookie", cookie)
      .send({ gameId: "g-missing" })
      .expect(400);
  });

  it("returns similar preview for a session", async () => {
    const cookie = `${SESSION_COOKIE_NAME}=${encodeSessionCookie(
      { userId, steamId: "76561198000000000" },
      secret,
    )}`;
    const res = await request(app.getHttpServer())
      .get("/v1/play-sessions/ps1/similar")
      .set("Cookie", cookie)
      .expect(200);
    expect(res.body).toEqual({
      count: 1,
      matchKind: "exe",
      matchValue: "dota2.exe",
    });
  });

  it("deletes a session owned by the user", async () => {
    const cookie = `${SESSION_COOKIE_NAME}=${encodeSessionCookie(
      { userId, steamId: "76561198000000000" },
      secret,
    )}`;
    const res = await request(app.getHttpServer())
      .delete("/v1/play-sessions/ps1")
      .set("Cookie", cookie)
      .expect(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("404s when deleting someone else's session", async () => {
    const cookie = `${SESSION_COOKIE_NAME}=${encodeSessionCookie(
      { userId, steamId: "76561198000000000" },
      secret,
    )}`;
    await request(app.getHttpServer())
      .delete("/v1/play-sessions/other")
      .set("Cookie", cookie)
      .expect(404);
  });
});
