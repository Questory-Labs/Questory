import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Controller, Get, INestApplication, UseGuards, VERSION_NEUTRAL, VersioningType } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { PUBLIC_API_RATE_LIMIT } from "@questorylabs/shared";
import { ApiKeyGuard } from "../../src/auth/api-key.guard";
import { Scopes } from "../../src/auth/scopes.decorator";
import { hashApiToken } from "../../src/accounts/accounts.service";
import { PrismaService } from "../../src/prisma/prisma.service";
import { CacheService } from "../../src/cache/cache.service";

@Controller({ path: "public/v1", version: VERSION_NEUTRAL })
@UseGuards(ApiKeyGuard)
class ProbeController {
  @Get("open")
  open() {
    return { ok: true };
  }

  @Get("scoped")
  @Scopes("library:read")
  scoped() {
    return { ok: true };
  }
}

const TOKEN = "qst_test_token_value";
const publicKey = {
  id: "k1",
  userId: "u1",
  type: "public",
  scopes: JSON.stringify(["profile:read"]),
};

describe("ApiKeyGuard", () => {
  let app: INestApplication;
  const findFirst = vi.fn();
  const update = vi.fn().mockResolvedValue({});
  const incr = vi.fn();
  const getString = vi.fn();
  const setString = vi.fn().mockResolvedValue(undefined);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
      providers: [
        ApiKeyGuard,
        { provide: PrismaService, useValue: { apiKey: { findFirst, update } } },
        { provide: CacheService, useValue: { incr, getString, setString } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
    await app.listen(0, "127.0.0.1");
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    findFirst.mockReset();
    update.mockClear();
    incr.mockReset().mockResolvedValue(1);
    getString.mockReset().mockResolvedValue(null);
    setString.mockClear();
  });

  const get = (path: string, token?: string) => {
    const req = request(app.getHttpServer()).get(path);
    return token ? req.set("Authorization", `Bearer ${token}`) : req;
  };

  it("rejects a missing key with 401", async () => {
    await get("/public/v1/open").expect(401);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("rejects an unknown or revoked key with 401", async () => {
    findFirst.mockResolvedValue(null);
    await get("/public/v1/open", TOKEN).expect(401);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tokenHash: hashApiToken(TOKEN), revokedAt: null },
      }),
    );
  });

  it("rejects a non-public key type with 401", async () => {
    findFirst.mockResolvedValue({ ...publicKey, type: "music_ingest", scopes: null });
    await get("/public/v1/open", TOKEN).expect(401);
  });

  it("accepts a valid public key", async () => {
    findFirst.mockResolvedValue(publicKey);
    await get("/public/v1/open", TOKEN).expect(200);
  });

  it("rejects a key missing the required scope with 403", async () => {
    findFirst.mockResolvedValue(publicKey);
    await get("/public/v1/scoped", TOKEN).expect(403);
  });

  it("allows a key carrying the required scope", async () => {
    findFirst.mockResolvedValue({
      ...publicKey,
      scopes: JSON.stringify(["library:read"]),
    });
    await get("/public/v1/scoped", TOKEN).expect(200);
  });

  it("returns 429 with Retry-After once the per-key limit is exceeded", async () => {
    findFirst.mockResolvedValue(publicKey);
    incr.mockResolvedValue(PUBLIC_API_RATE_LIMIT.max + 1);
    const res = await get("/public/v1/open", TOKEN).expect(429);
    expect(res.headers["retry-after"]).toBe(String(PUBLIC_API_RATE_LIMIT.ttl));
    expect(incr).toHaveBeenCalledWith("public-api:rl:k1", PUBLIC_API_RATE_LIMIT.ttl);
  });

  it("writes lastUsedAt once per minute", async () => {
    findFirst.mockResolvedValue(publicKey);
    await get("/public/v1/open", TOKEN).expect(200);
    expect(update).toHaveBeenCalledTimes(1);
    expect(setString).toHaveBeenCalledWith("public-api:last-used:k1", "1", 60);

    getString.mockResolvedValue("1");
    await get("/public/v1/open", TOKEN).expect(200);
    expect(update).toHaveBeenCalledTimes(1);
  });
});
