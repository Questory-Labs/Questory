import { describe, expect, it } from "vitest";
import {
  activeNavHref,
  activeSectionKey,
  buildNavFooter,
  buildNavGroups,
  formatNavCount,
} from "./nav-config";

describe("buildNavGroups", () => {
  it("puts cross-domain links under Everywhere and each domain in its own section", () => {
    const groups = buildNavGroups({ music: true, watch: true, read: true });
    expect(groups.map((g) => g.label)).toEqual(["Everywhere", "Games", "Music", "Watch", "Read"]);
    expect(groups.find((g) => g.key === "everywhere")?.collapsible).toBe(false);
    const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/dashboard",
        "/rewind",
        "/library",
        "/trending",
        "/friends",
        "/family",
        "/music",
        "/music/listening",
        "/music/charts",
        "/watch",
        "/watch/history",
        "/read",
        "/read/library",
      ]),
    );
    expect(groups.find((g) => g.key === "music")?.items.map((i) => i.icon)).toEqual([
      "music",
      "listening",
      "charts",
    ]);
  });

  it("hides media sections, For you and Goals when flags are off", () => {
    const hrefs = buildNavGroups({}).flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).not.toContain("/music");
    expect(hrefs).not.toContain("/recommendations");
    expect(hrefs).not.toContain("/recommendations/goals");
  });

  it("adds For you and Goals for enterprise", () => {
    const everywhere = buildNavGroups({ enterprise: true })[0];
    expect(everywhere.items.map((i) => i.label)).toEqual(["Home", "For you", "Goals", "Rewind"]);
  });
});

describe("buildNavFooter", () => {
  it("shows Sources only with a media module and Admin only for admins", () => {
    expect(buildNavFooter({}).map((i) => i.label)).toEqual(["Settings"]);
    expect(buildNavFooter({ watch: true, admin: true }).map((i) => i.label)).toEqual([
      "Sources",
      "Settings",
      "Admin",
    ]);
  });
});

describe("activeNavHref", () => {
  const groups = buildNavGroups({ music: true, read: true, enterprise: true });
  const items = [
    ...groups.flatMap((g) => g.items),
    ...buildNavFooter({ music: true, read: true }),
  ];

  it.each([
    ["/music/listening", "/music/listening"],
    ["/music/artists/12", "/music"],
    ["/music/rewind", "/rewind"],
    ["/library/rewind", "/rewind"],
    ["/library/42", "/library"],
    ["/read/history", "/read/library"],
    ["/music/settings", "/sources"],
    ["/settings/profile", "/settings/connections"],
    ["/recommendations/goals", "/recommendations/goals"],
  ])("maps %s to %s", (pathname, href) => {
    expect(activeNavHref(pathname, items)).toBe(href);
  });

  it("returns null for unknown paths", () => {
    expect(activeNavHref("/nowhere", items)).toBeNull();
  });

  it("finds the section that owns the active link", () => {
    expect(activeSectionKey("/music/charts", groups)).toBe("music");
    expect(activeSectionKey("/wishlist", groups)).toBe("games");
    expect(activeSectionKey("/rewind", groups)).toBe("everywhere");
  });
});

describe("formatNavCount", () => {
  it.each([
    [38, "38"],
    [412, "412"],
    [8200, "8.2k"],
    [1_250_000, "1.3m"],
  ])("formats %d as %s", (n, out) => {
    expect(formatNavCount(n)).toBe(out);
  });
});
