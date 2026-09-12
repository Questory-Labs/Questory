import { describe, expect, it } from "vitest";
import { buildNavGroups } from "./nav-config";

describe("buildNavGroups", () => {
  it("keeps Steam destinations and one /music rail item — never /music/listening", () => {
    const groups = buildNavGroups({ music: true, watch: true, read: true });
    const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/dashboard",
        "/library",
        "/wishlist",
        "/cost",
        "/friends",
        "/trending",
        "/collections",
        "/sessions",
        "/family",
        "/multiplayer",
        "/music",
        "/watch",
        "/read",
      ]),
    );
    expect(hrefs.filter((h) => h === "/music")).toHaveLength(1);
    expect(hrefs).not.toContain("/music/listening");
    expect(hrefs).not.toContain("/watch/history");
    expect(hrefs).not.toContain("/read/library");
  });

  it("hides media and recs when flags are off", () => {
    const hrefs = buildNavGroups({}).flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).not.toContain("/music");
    expect(hrefs).not.toContain("/recommendations");
  });
});
