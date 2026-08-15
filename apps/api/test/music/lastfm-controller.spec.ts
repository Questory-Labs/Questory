import {
  INestApplication,
  VersioningType,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { SessionUserGuard } from "../../src/music/auth/session-user.guard";
import { LastFmAuth } from "../../src/music/scrobbler/lastfm/lastfm.auth";
import { LastFmController } from "../../src/music/scrobbler/lastfm/lastfm.controller";

describe("LastFmController callback", () => {
  let app: INestApplication;
  const complete = vi.fn();
  const resolveUserIdFromToken = vi.fn();

  beforeAll(async () => {
    process.env.WEB_ORIGIN = "http://localhost:3000";
    process.env.SESSION_SECRET = "test-session-secret-32chars!!";
    const moduleRef = await Test.createTestingModule({
      controllers: [LastFmController],
      providers: [
        {
          provide: LastFmAuth,
          useValue: {
            complete,
            resolveUserIdFromToken,
            status: vi.fn(),
            authorizeUrl: vi.fn(),
            disconnect: vi.fn(),
          },
        },
      ],
    })
      .overrideGuard(SessionUserGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: "1",
    });
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it("exchanges the Last.fm token and redirects to settings", async () => {
    resolveUserIdFromToken.mockResolvedValue("u1");
    complete.mockResolvedValue({ ok: true, userId: "u1", username: "santosh" });
    const res = await request(app.getHttpServer())
      .get("/v1/music/scrobbler/lastfm/callback")
      .query({ token: "lfm-token" })
      .expect(302);
    expect(complete).toHaveBeenCalledWith("lfm-token", "u1");
    expect(res.headers.location).toBe(
      "http://localhost:3000/music/settings?lastfm=connected",
    );
  });

  it("redirects with error when the token is missing", async () => {
    const res = await request(app.getHttpServer())
      .get("/v1/music/scrobbler/lastfm/callback")
      .expect(302);
    expect(res.headers.location).toContain("lastfm=error");
  });
});
