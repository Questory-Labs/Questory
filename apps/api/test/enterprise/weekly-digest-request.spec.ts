import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { INestApplication, VersioningType } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import {
  SESSION_COOKIE_NAME,
  encodeSessionCookie,
} from "@questorylabs/shared/session";
import { EnterpriseRecommendationsController } from "../../src/enterprise/enterprise-recommendations.controller";
import { EnterpriseProxyService } from "../../src/enterprise/enterprise-proxy.service";
import { EnterpriseRateLimitService } from "../../src/enterprise/enterprise-rate-limit.service";

describe("weekly digest request validation", () => {
  let app: INestApplication;
  const secret = "test-session-secret-32chars!!";
  const forward = vi.fn().mockResolvedValue({ cached: false, generating: false });
  const assertAllowed = vi.fn().mockResolvedValue(undefined);

  beforeAll(async () => {
    process.env.SESSION_SECRET = secret;
    const moduleRef = await Test.createTestingModule({
      controllers: [EnterpriseRecommendationsController],
      providers: [
        { provide: EnterpriseProxyService, useValue: { forward } },
        { provide: EnterpriseRateLimitService, useValue: { assertAllowed } },
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

  it("rejects an invalid context hour", async () => {
    assertAllowed.mockClear();
    await request(app.getHttpServer())
      .post("/v1/recommendations/weekly-digest")
      .set("Cookie", cookie())
      .send({ context: { localHour: 99 } })
      .expect(400);
    expect(assertAllowed).not.toHaveBeenCalled();
  });

  it("forwards a parsed context body", async () => {
    forward.mockClear();
    await request(app.getHttpServer())
      .post("/v1/recommendations/weekly-digest")
      .set("Cookie", cookie())
      .send({
        context: { localHour: 20, localWeekday: 5, timeZone: "UTC" },
      })
      .expect(201);
    expect(forward).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/v1/recommendations/weekly-digest",
        body: {
          context: { localHour: 20, localWeekday: 5, timeZone: "UTC" },
        },
      }),
    );
  });

  it("injects the session userId into goals", async () => {
    forward.mockClear();
    await request(app.getHttpServer())
      .post("/v1/recommendations/goals")
      .set("Cookie", cookie())
      .send({ targetCount: 5, timeframe: "this month" })
      .expect(201);
    expect(forward).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/v1/recommendations/goals",
        body: {
          targetCount: 5,
          timeframe: "this month",
          userId: "u1",
        },
      }),
    );
  });
});
