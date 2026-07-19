import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  INestApplication,
  Controller,
  Get,
  UseGuards,
  VersioningType,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import {
  SESSION_COOKIE_NAME,
  encodeSessionCookie,
} from "@questorylabs/shared/session";
import { SteamAuthGuard } from "../../src/auth/auth.guard";
import { CurrentUser } from "../../src/auth/current-user.decorator";

@Controller("probe")
@UseGuards(SteamAuthGuard)
class ProbeController {
  @Get("me")
  me(@CurrentUser() user: { userId: string; steamId: string }) {
    return user;
  }
}

describe("SteamAuthGuard", () => {
  let app: INestApplication;
  const secret = "test-session-secret-32chars!!";

  beforeAll(async () => {
    process.env.SESSION_SECRET = secret;
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
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

  it("rejects missing cookie", async () => {
    await request(app.getHttpServer()).get("/v1/probe/me").expect(401);
  });

  it("accepts valid session cookie", async () => {
    const cookie = encodeSessionCookie(
      { userId: "u1", steamId: "76561198000000000" },
      secret,
    );
    const res = await request(app.getHttpServer())
      .get("/v1/probe/me")
      .set("Cookie", `${SESSION_COOKIE_NAME}=${cookie}`)
      .expect(200);
    expect(res.body.userId).toBe("u1");
  });

  it("rejects forged cookie", async () => {
    const cookie = encodeSessionCookie(
      { userId: "u1", steamId: "76561198000000000" },
      "wrong-secret-value!!!!",
    );
    await request(app.getHttpServer())
      .get("/v1/probe/me")
      .set("Cookie", `${SESSION_COOKIE_NAME}=${cookie}`)
      .expect(401);
  });
});
