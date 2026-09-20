import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  Controller,
  ForbiddenException,
  Get,
  INestApplication,
  Post,
  VersioningType,
} from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { featureDisabledMessage } from "@questorylabs/shared";
import { FeatureFlagsService } from "../../src/features/feature-flags.service";
import { FeatureHttpGuard } from "../../src/features/feature-http.guard";

@Controller("watch")
class WatchDummyController {
  @Get("analytics")
  analytics() {
    return { ok: true };
  }

  @Get("trakt/status")
  trakt() {
    return { ok: true };
  }

  @Get("anilist/status")
  anilistStatus() {
    return { ok: true };
  }

  @Get("anilist/callback")
  anilistCallback() {
    return { ok: true };
  }

  @Post("internal/cron/anilist-sync")
  anilistCron() {
    return { ok: true };
  }

  @Post("internal/cron/letterboxd-scrape")
  letterboxdCron() {
    return { ok: true };
  }
}

@Controller("music")
class MusicDummyController {
  @Get("ping")
  ping() {
    return { ok: true };
  }
}

describe("FeatureHttpGuard", () => {
  let app: INestApplication;
  const assertDomainEnabled = vi.fn();
  const assertSourceEnabled = vi.fn();
  const assertAnyDomainEnabled = vi.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WatchDummyController, MusicDummyController],
      providers: [
        FeatureHttpGuard,
        { provide: APP_GUARD, useExisting: FeatureHttpGuard },
        {
          provide: FeatureFlagsService,
          useValue: {
            assertDomainEnabled,
            assertSourceEnabled,
            assertAnyDomainEnabled,
          },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: "1",
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 403 when a domain is disabled", async () => {
    assertDomainEnabled.mockReset();
    assertSourceEnabled.mockReset();
    assertAnyDomainEnabled.mockReset();
    assertDomainEnabled.mockRejectedValue(
      new ForbiddenException(featureDisabledMessage("music")),
    );
    const res = await request(app.getHttpServer())
      .get("/v1/music/ping")
      .expect(403);
    expect(res.body.message).toBe("Music is disabled on this instance");
  });

  it("does not 403 watch analytics when Trakt is off", async () => {
    assertDomainEnabled.mockReset();
    assertSourceEnabled.mockReset();
    assertAnyDomainEnabled.mockReset();
    assertDomainEnabled.mockResolvedValue(undefined);
    assertSourceEnabled.mockRejectedValue(
      new ForbiddenException(featureDisabledMessage("trakt")),
    );
    await request(app.getHttpServer()).get("/v1/watch/analytics").expect(200);
    await request(app.getHttpServer()).get("/v1/watch/trakt/status").expect(403);
  });

  it("uses any-domain for shared AniList OAuth callback and HTTP cron", async () => {
    assertDomainEnabled.mockReset();
    assertSourceEnabled.mockReset();
    assertAnyDomainEnabled.mockReset();
    assertAnyDomainEnabled.mockResolvedValue(undefined);
    assertSourceEnabled.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .get("/v1/watch/anilist/callback")
      .expect(200);
    await request(app.getHttpServer())
      .post("/v1/watch/internal/cron/anilist-sync")
      .expect(201);
    expect(assertAnyDomainEnabled).toHaveBeenCalledWith(["watch", "read"]);
    expect(assertDomainEnabled).not.toHaveBeenCalled();
  });

  it("still requires Watch for AniList status and Letterboxd cron", async () => {
    assertDomainEnabled.mockReset();
    assertSourceEnabled.mockReset();
    assertAnyDomainEnabled.mockReset();
    assertDomainEnabled.mockResolvedValue(undefined);
    assertSourceEnabled.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .get("/v1/watch/anilist/status")
      .expect(200);
    await request(app.getHttpServer())
      .post("/v1/watch/internal/cron/letterboxd-scrape")
      .expect(201);
    expect(assertDomainEnabled).toHaveBeenCalledWith("watch");
    expect(assertAnyDomainEnabled).not.toHaveBeenCalled();
  });

  it("returns 403 when neither Watch nor Read is enabled for callback", async () => {
    assertDomainEnabled.mockReset();
    assertSourceEnabled.mockReset();
    assertAnyDomainEnabled.mockReset();
    assertAnyDomainEnabled.mockRejectedValue(
      new ForbiddenException(featureDisabledMessage("watch")),
    );
    await request(app.getHttpServer())
      .get("/v1/watch/anilist/callback")
      .expect(403);
  });
});
