import { describe, expect, it } from "vitest";
import { dashboardOccupancy } from "./dashboard-occupancy";

const base = {
  steamLinked: true,
  statsFailed: false,
  statsEmpty: false,
  hasContinue: false,
  playNextFailed: false,
  playNextEmpty: false,
};

describe("dashboardOccupancy", () => {
  it("shows continue without waiting on play-next", () => {
    const o = dashboardOccupancy({
      ...base,
      hasContinue: true,
      playNextEmpty: true,
    });
    expect(o.showContinue).toBe(true);
    expect(o.continueSkeleton).toBe(false);
    expect(o.showUnlinked).toBe(false);
  });

  it("keeps a hero skeleton when stats are ready, there is no recent, and play-next is still empty", () => {
    const o = dashboardOccupancy({
      ...base,
      hasContinue: false,
      playNextEmpty: true,
    });
    expect(o.continueSkeleton).toBe(true);
    expect(o.showUnlinked).toBe(false);
  });

  it("does not treat play-next failure as unlinked", () => {
    const o = dashboardOccupancy({
      ...base,
      hasContinue: true,
      playNextFailed: true,
      playNextEmpty: true,
    });
    expect(o.playNextError).toBe(true);
    expect(o.showUnlinked).toBe(false);
  });

  it("does not promote a play-next pick as last-played when stats failed", () => {
    const o = dashboardOccupancy({
      ...base,
      statsFailed: true,
      hasContinue: false,
      playNextEmpty: false,
    });
    expect(o.showContinue).toBe(false);
    expect(o.statsError).toBe(true);
  });

  it("shows unlinked only when stats are ready, there is no continue, and Steam is not linked", () => {
    const o = dashboardOccupancy({
      ...base,
      steamLinked: false,
      hasContinue: false,
      playNextEmpty: false,
      playNextFailed: true,
    });
    expect(o.showUnlinked).toBe(true);
    expect(o.continueSkeleton).toBe(false);
  });

  it("skeletons continue while stats are still empty", () => {
    const o = dashboardOccupancy({
      ...base,
      statsEmpty: true,
      hasContinue: false,
      playNextEmpty: true,
    });
    expect(o.continueSkeleton).toBe(true);
    expect(o.showContinue).toBe(false);
  });

  it("never uses stats.empty || playNext.empty as a page-wide unlinked gate", () => {
    const o = dashboardOccupancy({
      ...base,
      hasContinue: true,
      statsEmpty: false,
      playNextEmpty: true,
    });
    expect(o.showUnlinked).toBe(false);
    expect(o.showContinue).toBe(true);
  });
});
