import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  Controller,
  ForbiddenException,
  Get,
  INestApplication,
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

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WatchDummyController, MusicDummyController],
      providers: [
        FeatureHttpGuard,
        { provide: APP_GUARD, useExisting: FeatureHttpGuard },
        {
          provide: FeatureFlagsService,
          useValue: { assertDomainEnabled, assertSourceEnabled },
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
    assertDomainEnabled.mockResolvedValue(undefined);
    assertSourceEnabled.mockRejectedValue(
      new ForbiddenException(featureDisabledMessage("trakt")),
    );
    await request(app.getHttpServer()).get("/v1/watch/analytics").expect(200);
    await request(app.getHttpServer()).get("/v1/watch/trakt/status").expect(403);
  });
});
