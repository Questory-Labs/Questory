import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { INestApplication, VersioningType } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import {
  SESSION_COOKIE_NAME,
  encodeSessionCookie,
} from "@questorylabs/shared/session";
import { GoalsController } from "../../src/goals/goals.controller";
import { GoalsService } from "../../src/goals/goals.service";

describe("goals controller", () => {
  let app: INestApplication;
  const secret = "test-session-secret-32chars!!";
  const svc = {
    list: vi.fn().mockResolvedValue({ items: [] }),
    create: vi.fn().mockResolvedValue({ id: "g1" }),
    update: vi.fn().mockResolvedValue({ id: "g1" }),
    remove: vi.fn().mockResolvedValue({ ok: true }),
  };

  beforeAll(async () => {
    process.env.SESSION_SECRET = secret;
    const moduleRef = await Test.createTestingModule({
      controllers: [GoalsController],
      providers: [{ provide: GoalsService, useValue: svc }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
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

  it("requires auth", async () => {
    await request(app.getHttpServer()).get("/v1/goals").expect(401);
  });

  it("parses list filters with defaults", async () => {
    await request(app.getHttpServer())
      .get("/v1/goals?domain=music")
      .set("Cookie", cookie())
      .expect(200);
    expect(svc.list).toHaveBeenCalledWith("u1", {
      domain: "music",
      status: "active",
      limit: 50,
    });
  });

  it("rejects an unbounded limit and a bad status", async () => {
    await request(app.getHttpServer())
      .get("/v1/goals?limit=1000")
      .set("Cookie", cookie())
      .expect(400);
    await request(app.getHttpServer())
      .get("/v1/goals?status=nope")
      .set("Cookie", cookie())
      .expect(400);
  });

  it("validates create bodies", async () => {
    await request(app.getHttpServer())
      .post("/v1/goals")
      .set("Cookie", cookie())
      .send({ kind: "game", name: "", domain: "games", timeframe: "month" })
      .expect(400);
    await request(app.getHttpServer())
      .post("/v1/goals")
      .set("Cookie", cookie())
      .send({ kind: "game", name: "Hades", domain: "games", timeframe: "month" })
      .expect(201);
    expect(svc.create.mock.calls[0]![0]).toBe("u1");
  });

  it("requires done or progressValue on patch", async () => {
    await request(app.getHttpServer())
      .patch("/v1/goals/g1")
      .set("Cookie", cookie())
      .send({})
      .expect(400);
    await request(app.getHttpServer())
      .patch("/v1/goals/g1")
      .set("Cookie", cookie())
      .send({ done: true })
      .expect(200);
    expect(svc.update).toHaveBeenCalledWith("u1", "g1", { done: true });
  });

  it("deletes the caller goal", async () => {
    await request(app.getHttpServer())
      .delete("/v1/goals/g1")
      .set("Cookie", cookie())
      .expect(200);
    expect(svc.remove).toHaveBeenCalledWith("u1", "g1");
  });
});
