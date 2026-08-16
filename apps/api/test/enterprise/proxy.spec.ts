import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import {
  INestApplication,
  Body,
  Controller,
  Post,
  UseGuards,
  VersioningType,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { encodeSessionCookie } from "@questorylabs/shared/session";
import { SteamAuthGuard } from "../../src/auth/auth.guard";
import { EnterpriseProxyService } from "../../src/enterprise/enterprise-proxy.service";
import { EnterpriseRateLimitService } from "../../src/enterprise/enterprise-rate-limit.service";
import { CacheService } from "../../src/cache/cache.service";
import { liveSessionPrismaProvider } from "../live-session-prisma";

const SECRET = "enterprise-proxy-test-secret!!!!";

@Controller("recommendations")
@UseGuards(SteamAuthGuard)
class ProbeEnterpriseController {
  constructor(
    private readonly proxy: EnterpriseProxyService,
    private readonly rateLimit: EnterpriseRateLimitService,
  ) {}

  @Post()
  async recommendations(@Body() body: unknown) {
    await this.rateLimit.assertAllowed("user-1", "recommendations");
    return this.proxy.forward({
      userId: "user-1",
      isAdmin: false,
      method: "POST",
      path: "/v1/recommendations",
      body,
    });
  }
}

describe("Enterprise proxy", () => {
  let app: INestApplication;
  const fetchMock = vi.fn();

  beforeAll(async () => {
    process.env.SESSION_SECRET = SECRET;
    process.env.ENTERPRISE_INTERNAL_SECRET = SECRET;
    process.env.ENTERPRISE_URL = "http://127.0.0.1:4030";
    vi.stubGlobal("fetch", fetchMock);

    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeEnterpriseController],
      providers: [
        SteamAuthGuard,
        EnterpriseProxyService,
        EnterpriseRateLimitService,
        CacheService,
        liveSessionPrismaProvider(),
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: "1",
    });
    app.use(cookieParser(SECRET));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllGlobals();
  });

  it("rejects unauthenticated requests", async () => {
    await request(app.getHttpServer())
      .post("/v1/recommendations")
      .send({ limit: 5 })
      .expect(401);
  });

  it("forwards with internal bearer when session is valid", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ items: [] }), { status: 200 }),
    );
    const cookie = encodeSessionCookie(
      { userId: "user-1", steamId: null },
      SECRET,
    );
    await request(app.getHttpServer())
      .post("/v1/recommendations")
      .set("Cookie", `questorylabs_session=${cookie}`)
      .send({ limit: 5 })
      .expect(201);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://127.0.0.1:4030/v1/recommendations");
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization ?? headers.Authorization).toMatch(/^Bearer /);
  });
});
