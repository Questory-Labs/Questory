import { describe, expect, it } from "vitest";
import {
  mergeDashboardActivity,
  type DashboardActivityItem,
} from "./dashboard-activity";

describe("mergeDashboardActivity", () => {
  const row = (
    patch: Partial<DashboardActivityItem> & Pick<DashboardActivityItem, "id" | "at">,
  ): DashboardActivityItem => ({
    domain: "games",
    name: patch.id,
    href: "/",
    ...patch,
  });

  it("sorts newest first and caps", () => {
    const merged = mergeDashboardActivity(
      [
        row({ id: "a", at: "2026-09-01T00:00:00.000Z" }),
        row({ id: "b", at: "2026-09-11T00:00:00.000Z", domain: "watch" }),
        row({ id: "c", at: "2026-09-05T00:00:00.000Z" }),
      ],
      2,
    );
    expect(merged.map((i) => i.id)).toEqual(["b", "c"]);
  });

  it("drops missing timestamps", () => {
    expect(
      mergeDashboardActivity([
        row({ id: "bad", at: "" }),
        row({ id: "ok", at: "2026-09-11T00:00:00.000Z" }),
      ]).map((i) => i.id),
    ).toEqual(["ok"]);
  });
});
