import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { INestApplication, VersioningType } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { ApiKeyGuard } from "../../src/auth/api-key.guard";
import { PublicApiController } from "../../src/public-api/public-api.controller";
import { PublicApiDocsController } from "../../src/public-api/public-api-docs.controller";
import { PublicApiService, stripCostFields } from "../../src/public-api/public-api.service";
import { publicApiOpenApiDocument } from "../../src/public-api/openapi";
import { LibraryService } from "../../src/library/library.service";
import { BacklogService } from "../../src/library/backlog.service";
import { UsersService } from "../../src/users/users.service";
import { WishlistService } from "../../src/wishlist/wishlist.service";
import { FeatureFlagsService } from "../../src/features/feature-flags.service";
import { MonthlyRecapService } from "../../src/recap/monthly-recap.service";
import { AnalyticsService as MusicAnalyticsService } from "../../src/music/analytics/analytics.service";
import { AnalyticsService as WatchAnalyticsService } from "../../src/watch/analytics/analytics.service";
import { ReadAnalyticsService } from "../../src/read/analytics/analytics.service";
import { GamesRewindService } from "../../src/games/rewind/games-rewind.service";

const ALL_SCOPES = [
  "profile:read",
  "library:read",
  "wishlist:read",
  "sessions:read",
  "rewind:read",
  "music:read",
  "watch:read",
  "read:read",
];

const entry = {
  id: "e1",
  pricePaid: 10,
  purchasedAt: "2020-01-01",
  valueAmount: 5,
  costPerHour: 1,
  playtimeForever: 60,
  ownerships: [{ store: "steam", pricePaid: 10 }],
};

describe("PublicApiController", () => {
  let app: INestApplication;
  const library = { list: vi.fn(), getOne: vi.fn(), getOneByAppId: vi.fn() };
  const backlog = { summary: vi.fn() };
  const users = { findById: vi.fn() };
  const wishlist = { list: vi.fn(), dealAlerts: vi.fn() };
  const flags = { assertDomainEnabled: vi.fn(), isDomainEnabled: vi.fn() };
  const recap = { combinedStats: vi.fn() };
  const music = { rewindStats: vi.fn(), recent: vi.fn() };
  const watch = { rewindStats: vi.fn(), recent: vi.fn() };
  const read = { rewindStats: vi.fn(), recent: vi.fn() };
  const games = { rewindStats: vi.fn() };
  const publicApi = { nowPlaying: vi.fn(), recent: vi.fn() };
  let scopes = ALL_SCOPES;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PublicApiDocsController, PublicApiController],
      providers: [
        { provide: LibraryService, useValue: library },
        { provide: BacklogService, useValue: backlog },
        { provide: UsersService, useValue: users },
        { provide: WishlistService, useValue: wishlist },
        { provide: FeatureFlagsService, useValue: flags },
        { provide: MonthlyRecapService, useValue: recap },
        { provide: MusicAnalyticsService, useValue: music },
        { provide: WatchAnalyticsService, useValue: watch },
        { provide: ReadAnalyticsService, useValue: read },
        { provide: GamesRewindService, useValue: games },
        { provide: PublicApiService, useValue: publicApi },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({
        canActivate: (ctx: { switchToHttp: () => { getRequest: () => Record<string, unknown> } }) => {
          const req = ctx.switchToHttp().getRequest();
          req.userId = "u1";
          req.apiKeyScopes = scopes;
          return true;
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
    await app.listen(0, "127.0.0.1");
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    scopes = ALL_SCOPES;
    for (const mock of [library, users, wishlist, flags, recap, music, watch, read, games, publicApi]) {
      for (const fn of Object.values(mock)) fn.mockReset();
    }
    flags.assertDomainEnabled.mockResolvedValue(undefined);
  });

  const get = (path: string) => request(app.getHttpServer()).get(path);

  it("is mounted version-neutral at /public/v1", async () => {
    users.findById.mockResolvedValue({
      id: "u1",
      personaName: "P",
      avatarUrl: null,
      profileUrl: null,
      countryCode: "IN",
      steamId: "765",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      email: "secret@example.com",
      passwordHash: "x",
    });
    const res = await get("/public/v1/me").expect(200);
    expect(res.body).toEqual({
      id: "u1",
      personaName: "P",
      avatarUrl: null,
      profileUrl: null,
      countryCode: "IN",
      steamId: "765",
      createdAt: "2026-01-01T00:00:00.000Z",
      scopes: ALL_SCOPES,
    });
    expect(res.body.email).toBeUndefined();
    await get("/v1/public/v1/me").expect(404);
  });

  it("delegates library list with parsed filters and strips cost fields", async () => {
    library.list.mockResolvedValue({ total: 1, page: 2, pageSize: 10, items: [entry] });
    const res = await get("/public/v1/library?page=2&pageSize=10&unplayed=true&sort=name").expect(200);
    expect(library.list).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ page: 2, pageSize: 10, unplayed: true, sort: "name" }),
    );
    expect(res.body.items[0]).toEqual({
      id: "e1",
      playtimeForever: 60,
      ownerships: [{ store: "steam" }],
    });
    await get("/public/v1/library?page=0").expect(400);
    await get("/public/v1/library?sort=nope").expect(400);
  });

  it("serves library/backlog before the :id route", async () => {
    backlog.summary.mockResolvedValueOnce({ counts: { backlog: 3 } });
    const res = await request(app.getHttpServer())
      .get("/public/v1/library/backlog?tz=UTC")
      .set("Authorization", "Bearer x");
    expect(res.status).toBe(200);
    expect(backlog.summary).toHaveBeenCalledWith("u1", "UTC");
    expect(library.getOne).not.toHaveBeenCalled();
  });

  it("resolves library/:id by appId or game id", async () => {
    library.getOneByAppId.mockResolvedValue(entry);
    library.getOne.mockResolvedValue(entry);
    await get("/public/v1/library/440").expect(200);
    expect(library.getOneByAppId).toHaveBeenCalledWith("u1", 440);
    const res = await get("/public/v1/library/g1").expect(200);
    expect(library.getOne).toHaveBeenCalledWith("u1", "g1");
    expect(res.body.pricePaid).toBeUndefined();
  });

  it("delegates now-playing and recent with key scopes", async () => {
    publicApi.nowPlaying.mockResolvedValue({ game: null, music: null });
    publicApi.recent.mockResolvedValue({ items: [] });
    await get("/public/v1/now-playing").expect(200);
    expect(publicApi.nowPlaying).toHaveBeenCalledWith("u1", ALL_SCOPES);
    await get("/public/v1/recent?limit=5").expect(200);
    expect(publicApi.recent).toHaveBeenCalledWith("u1", ALL_SCOPES, 5);
    await get("/public/v1/recent?limit=500").expect(400);
  });

  it("delegates wishlist and deals", async () => {
    wishlist.list.mockResolvedValue({ total: 0, page: 1, pageSize: 24, items: [] });
    wishlist.dealAlerts.mockResolvedValue([]);
    await get("/public/v1/wishlist?store=steam").expect(200);
    expect(wishlist.list).toHaveBeenCalledWith("u1", "steam", { page: 1, pageSize: 24 });
    await get("/public/v1/wishlist/deals").expect(200);
    expect(wishlist.dealAlerts).toHaveBeenCalledWith("u1");
  });

  it("routes rewind by domain and validates period", async () => {
    games.rewindStats.mockResolvedValue({ domain: "games" });
    music.rewindStats.mockResolvedValue({ domain: "music" });
    recap.combinedStats.mockResolvedValue({ domain: "all" });
    await get("/public/v1/rewind/games/2026-03").expect(200);
    expect(games.rewindStats).toHaveBeenCalledWith("u1", "2026-03", "UTC");
    await get("/public/v1/rewind/music/2026?tz=Asia/Kolkata").expect(200);
    expect(flags.assertDomainEnabled).toHaveBeenCalledWith("music");
    expect(music.rewindStats).toHaveBeenCalledWith("u1", "2026", "Asia/Kolkata");
    await get("/public/v1/rewind/all/2026").expect(200);
    expect(recap.combinedStats).toHaveBeenCalledWith("u1", "2026", "UTC");
    await get("/public/v1/rewind/games/26-1").expect(400);
    await get("/public/v1/rewind/books/2026").expect(400);
  });

  it("delegates paged domain histories", async () => {
    const page = { total: 0, page: 1, pageSize: 40, items: [] };
    music.recent.mockResolvedValue(page);
    watch.recent.mockResolvedValue(page);
    read.recent.mockResolvedValue(page);
    await get("/public/v1/music/listens?page=2").expect(200);
    expect(music.recent).toHaveBeenCalledWith("u1", 2, 40);
    await get("/public/v1/watch/history?pageSize=5").expect(200);
    expect(watch.recent).toHaveBeenCalledWith("u1", 1, 5);
    await get("/public/v1/read/history").expect(200);
    expect(read.recent).toHaveBeenCalledWith("u1", 1, 40);
  });

  it("serves the OpenAPI document without auth", async () => {
    const res = await get("/public/v1/openapi.json").expect(200);
    expect(res.body.openapi).toBe("3.0.3");
    expect(Object.keys(res.body.paths)).toEqual(Object.keys(publicApiOpenApiDocument.paths));
  });
});

describe("stripCostFields", () => {
  it("removes cost keys recursively and keeps dates", () => {
    const d = new Date();
    expect(stripCostFields({ a: 1, pricePaid: 2, nested: [{ costPerHour: 3, d }] })).toEqual({
      a: 1,
      nested: [{ d }],
    });
  });
});
