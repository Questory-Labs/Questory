import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsController } from "../../src/music/analytics/analytics.controller";
import type { AnalyticsService } from "../../src/music/analytics/analytics.service";
import type { HeatmapService } from "../../src/music/analytics/heatmap.service";
import type { PlayingNowService } from "../../src/music/playing-now/playing-now.service";

describe("AnalyticsController music filters", () => {
  const recent = vi.fn();
  const movers = vi.fn();
  const artistTimeSeries = vi.fn();
  const artistDetail = vi.fn();
  const user = { userId: "user-1" };
  let controller: AnalyticsController;

  beforeEach(() => {
    recent.mockReset().mockResolvedValue({ items: [] });
    movers.mockReset().mockResolvedValue({ movers: [] });
    artistTimeSeries.mockReset().mockResolvedValue([]);
    artistDetail.mockReset().mockResolvedValue({});
    controller = new AnalyticsController(
      { recent, movers, artistTimeSeries, artistDetail } as unknown as AnalyticsService,
      {} as HeatmapService,
      {} as PlayingNowService,
    );
  });

  it("passes validated q and source to recent", () => {
    controller.recent(user, "2", "10", undefined, " moon ", "imports");
    expect(recent).toHaveBeenCalledWith("user-1", 2, 10, {
      q: "moon",
      source: "imports",
    });
  });

  it("rejects an unknown source", () => {
    expect(() =>
      controller.recent(user, undefined, undefined, undefined, undefined, "spotify"),
    ).toThrow(BadRequestException);
  });

  it("treats empty filters as absent", () => {
    controller.recent(user, undefined, undefined, undefined, "", "");
    expect(recent).toHaveBeenCalledWith("user-1", 1, 40, {});
  });

  it("defaults movers to artists over a week", () => {
    controller.movers(user);
    expect(movers).toHaveBeenCalledWith("user-1", "artists", "week", 5);
  });

  it("bounds the movers limit and kind", () => {
    expect(() => controller.movers(user, "artists", "week", "21")).toThrow(
      BadRequestException,
    );
    expect(() => controller.movers(user, "labels")).toThrow(BadRequestException);
  });

  it("validates artist time series granularity", () => {
    expect(() => controller.artistTimeSeries(user, "a1", "day")).toThrow(
      BadRequestException,
    );
    controller.artistTimeSeries(user, "a1", "hourOfDay", "month", "UTC");
    expect(artistTimeSeries).toHaveBeenCalledWith(
      "user-1",
      "a1",
      "hourOfDay",
      "month",
      "UTC",
    );
  });

  it("forwards the time zone to artist detail", () => {
    controller.artistDetail(user, "a1", undefined, "UTC");
    expect(artistDetail).toHaveBeenCalledWith("user-1", "a1", "all", "UTC");
  });
});
