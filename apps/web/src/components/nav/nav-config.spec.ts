import { describe, expect, it } from "vitest";
import { buildNavGroups } from "./nav-config";

describe("buildNavGroups", () => {
  it("expands music, watch, and read like Steam — not a 3-link Media bucket", () => {
    const groups = buildNavGroups({ music: true, watch: true, read: true });
    const labels = groups.map((g) => g.label);
    expect(labels).not.toContain("Media");
    expect(labels).toEqual(
      expect.arrayContaining(["Your games", "Music", "Watch", "Read"]),
    );
    const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/dashboard",
        "/library",
        "/music",
        "/music/listening",
        "/music/charts",
        "/watch",
        "/watch/history",
        "/read",
        "/read/library",
      ]),
    );
    expect(groups.find((g) => g.label === "Music")?.items.map((i) => i.icon)).toEqual([
      "music",
      "listening",
      "charts",
      "rewind",
      "sources",
    ]);
    expect(
      groups.find((g) => g.label === "Watch")?.items.map((i) => i.icon),
    ).toEqual(["watch", "history", "rewind", "sources"]);
  });

  it("hides media and recs when flags are off", () => {
    const hrefs = buildNavGroups({}).flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).not.toContain("/music");
    expect(hrefs).not.toContain("/recommendations");
  });
});
