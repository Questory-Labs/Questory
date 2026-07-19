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
import { SessionUserGuard } from "../../src/auth/session-user.guard";
import { UsersService } from "../../src/users/users.service";
import { CurrentWatchUserId } from "../../src/auth/current-watch-user.decorator";

@Controller("probe")
class ProbeController {
  @Get("me")
  @UseGuards(SessionUserGuard)
  me(@CurrentWatchUserId() userId: string) {
    return { userId };
  }
}

describe("SessionUserGuard", () => {
  let app: INestApplication;
  const secret = "test-session-secret-32chars!!";

  beforeAll(async () => {
    process.env.SESSION_SECRET = secret;
    process.env.APP_MODE = "production";
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
      providers: [
        SessionUserGuard,
        {
          provide: UsersService,
          useValue: {
            resolveSoleUser: async () => null,
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

  it("rejects unauthenticated requests in production", async () => {
    await request(app.getHttpServer()).get("/v1/probe/me").expect(401);
  });

  it("binds session userId", async () => {
    const cookie = encodeSessionCookie(
      { userId: "user-a", steamId: "76561198000000000" },
      secret,
    );
    const res = await request(app.getHttpServer())
      .get("/v1/probe/me")
      .set("Cookie", `${SESSION_COOKIE_NAME}=${cookie}`)
      .expect(200);
    expect(res.body.userId).toBe("user-a");
  });

  it("forbids mismatched userId query (IDOR)", async () => {
    const cookie = encodeSessionCookie(
      { userId: "user-a", steamId: "76561198000000000" },
      secret,
    );
    await request(app.getHttpServer())
      .get("/v1/probe/me?userId=user-b")
      .set("Cookie", `${SESSION_COOKIE_NAME}=${cookie}`)
      .expect(403);
  });
});

describe("SessionUserGuard sole-user fallback", () => {
  let app: INestApplication;
  const secret = "test-session-secret-32chars!!";

  beforeAll(async () => {
    process.env.SESSION_SECRET = secret;
    process.env.APP_MODE = "local";
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
      providers: [
        SessionUserGuard,
        {
          provide: UsersService,
          useValue: {
            resolveSoleUser: async () => ({ id: "sole-user" }),
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

  it("allows sole-user local fallback without cookie", async () => {
    const res = await request(app.getHttpServer())
      .get("/v1/probe/me")
      .expect(200);
    expect(res.body.userId).toBe("sole-user");
  });

  it("rejects sole-user fallback when client supplies userId", async () => {
    await request(app.getHttpServer())
      .get("/v1/probe/me?userId=other")
      .expect(401);
  });
});
