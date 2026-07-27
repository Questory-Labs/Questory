import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { INestApplication, VersioningType } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import {
  SESSION_COOKIE_NAME,
  encodeSessionCookie,
} from "@questorylabs/shared/session";
import { CollectionsController } from "../../src/collections/collections.controller";
import { CollectionsService } from "../../src/collections/collections.service";

describe("collections validation", () => {
  let app: INestApplication;
  const secret = "test-session-secret-32chars!!";

  beforeAll(async () => {
    process.env.SESSION_SECRET = secret;
    const moduleRef = await Test.createTestingModule({
      controllers: [CollectionsController],
      providers: [
        {
          provide: CollectionsService,
          useValue: {
            list: async () => [],
            getOne: async () => ({}),
            createCustom: async (_u: string, name: string) => ({ id: "c1", name }),
            updateCustom: async () => ({}),
            removeCustom: async () => ({ ok: true }),
            addGame: async () => ({}),
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

  it("rejects empty name and oversized name", async () => {
    const cookie = `${SESSION_COOKIE_NAME}=${encodeSessionCookie(
      { userId: "u1", steamId: "76561198000000000" },
      secret,
    )}`;
    await request(app.getHttpServer())
      .post("/v1/collections")
      .set("Cookie", cookie)
      .send({ name: "" })
      .expect(400);
    await request(app.getHttpServer())
      .post("/v1/collections")
      .set("Cookie", cookie)
      .send({ name: "x".repeat(500) })
      .expect(400);
  });

  it("accepts XSS-looking name as opaque string (stored, not executed)", async () => {
    const cookie = `${SESSION_COOKIE_NAME}=${encodeSessionCookie(
      { userId: "u1", steamId: "76561198000000000" },
      secret,
    )}`;
    const res = await request(app.getHttpServer())
      .post("/v1/collections")
      .set("Cookie", cookie)
      .send({ name: "<script>alert(1)</script>" })
      .expect(201);
    expect(res.body.name).toContain("<script>");
  });
});
