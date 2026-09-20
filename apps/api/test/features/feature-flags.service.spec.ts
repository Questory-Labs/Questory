import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { FeatureFlagsService } from "../../src/features/feature-flags.service";
import { FEATURE_FLAGS_TTL_MS } from "../../src/features/features.constants";
import type { PrismaService } from "../../src/prisma/prisma.service";

const ENV_KEYS = [
  "FEATURE_MUSIC",
  "FEATURE_WATCH",
  "FEATURE_READ",
  "NEXT_PUBLIC_ENABLE_MUSIC",
  "NEXT_PUBLIC_ENABLE_WATCH",
  "NEXT_PUBLIC_ENABLE_READ",
] as const;

describe("FeatureFlagsService", () => {
  const findMany = vi.fn();
  const upsert = vi.fn();
  let service: FeatureFlagsService;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
    upsert.mockReset().mockResolvedValue({});
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    service = new FeatureFlagsService({
      appConfig: { findMany, upsert },
    } as unknown as PrismaService);
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  it("defaults domains off and sources on", async () => {
    const status = await service.getPublicStatus();
    expect(status.music.enabled).toBe(false);
    expect(status.watch.enabled).toBe(false);
    expect(status.read.enabled).toBe(false);
    expect(status.sources.lastfm).toBe(true);
    expect(status.sources.anilist).toBe(true);
  });

  it("prefers AppConfig over env", async () => {
    process.env.FEATURE_MUSIC = "true";
    findMany.mockResolvedValue([
      { key: "feature.music", value: "false" },
    ]);
    expect(await service.isDomainEnabled("music")).toBe(false);
    const admin = await service.getAdminFlags();
    expect(admin.domains.music).toEqual({ enabled: false, origin: "db" });
  });

  it("prefers FEATURE_* over NEXT_PUBLIC_ENABLE_*", async () => {
    process.env.FEATURE_MUSIC = "false";
    process.env.NEXT_PUBLIC_ENABLE_MUSIC = "true";
    expect(await service.isDomainEnabled("music")).toBe(false);
    const admin = await service.getAdminFlags();
    expect(admin.domains.music.origin).toBe("env");
  });

  it("falls back to NEXT_PUBLIC_ENABLE_* when FEATURE_* is unset", async () => {
    process.env.NEXT_PUBLIC_ENABLE_WATCH = "true";
    expect(await service.isDomainEnabled("watch")).toBe(true);
  });

  it("uses last-known values when a later DB read fails", async () => {
    findMany.mockResolvedValueOnce([
      { key: "feature.read", value: "true" },
    ]);
    expect(await service.isDomainEnabled("read")).toBe(true);
    findMany.mockRejectedValue(new Error("db down"));
    vi.useFakeTimers();
    vi.advanceTimersByTime(FEATURE_FLAGS_TTL_MS + 1);
    expect(await service.isDomainEnabled("read")).toBe(true);
    vi.useRealTimers();
  });

  it("patches L1 immediately on setDomain", async () => {
    await service.setDomain("music", true);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "feature.music" },
        create: { key: "feature.music", value: "true" },
      }),
    );
    expect(await service.isDomainEnabled("music")).toBe(true);
  });

  it("throws 403 when a domain is disabled", async () => {
    await expect(service.assertDomainEnabled("music")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
