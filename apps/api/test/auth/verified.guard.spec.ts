import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  INestApplication,
  Controller,
  Get,
  UseGuards,
  VersioningType,
  VERSION_NEUTRAL,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import {
  SESSION_COOKIE_NAME,
  encodeSessionCookie,
} from "@questorylabs/shared/session";
import { SteamAuthGuard } from "../../src/auth/auth.guard";
import { VerifiedGuard } from "../../src/auth/verified.guard";
import { PrismaService } from "../../src/prisma/prisma.service";
import { liveSessionUser } from "../live-session-prisma";
import { APP_GUARD } from "@nestjs/core";

@Controller("probe")
@UseGuards(SteamAuthGuard)
class ProbeController {
  @Get("secret")
  secret() {
    return { ok: true };
  }
}

@Controller({ path: "auth", version: VERSION_NEUTRAL })
class AuthProbeController {
  @Get("me")
  me() {
    return { user: { id: "u1" } };
  }
}

describe("VerifiedGuard", () => {
  let app: INestApplication;
  const secret = "test-session-secret-32chars!!";
  const user = {
    ...liveSessionUser("u1"),
    emailVerifiedAt: null as Date | null,
  };

  beforeAll(async () => {
    process.env.SESSION_SECRET = secret;
    process.env.SMTP_ENABLED = "true";
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_FROM = "a@b.c";
    process.env.QUESTORY_CLOUD = "true";

    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController, AuthProbeController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: async () => user,
            },
            appConfig: {
              findUnique: async () => ({ value: "true" }),
            },
          },
        },
        { provide: APP_GUARD, useClass: VerifiedGuard },
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
    delete process.env.SMTP_ENABLED;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_FROM;
    delete process.env.QUESTORY_CLOUD;
  });

  it("allows /auth/me while unverified", async () => {
    const cookie = encodeSessionCookie({ userId: "u1", steamId: null }, secret);
    await request(app.getHttpServer())
      .get("/auth/me")
      .set("Cookie", `${SESSION_COOKIE_NAME}=${cookie}`)
      .expect(200);
  });

  it("blocks /v1 product routes until verified", async () => {
    const cookie = encodeSessionCookie({ userId: "u1", steamId: null }, secret);
    const res = await request(app.getHttpServer())
      .get("/v1/probe/secret")
      .set("Cookie", `${SESSION_COOKIE_NAME}=${cookie}`)
      .expect(403);
    expect(JSON.stringify(res.body)).toContain("email_unverified");
  });
});
