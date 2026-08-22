import { describe, expect, it } from "vitest";
import { entityHref, parseKind } from "./music.charts.utils";

describe("music.charts.utils", () => {
  it("parses known kinds and defaults to artists", () => {
    expect(parseKind("tracks")).toBe("tracks");
    expect(parseKind("nope")).toBe("artists");
    expect(parseKind(null)).toBe("artists");
  });

  it("builds entity hrefs for linkable kinds", () => {
    expect(entityHref("artists", "a1")).toBe("/music/artists/a1");
    expect(entityHref("albums", "r1")).toBe("/music/albums/r1");
    expect(entityHref("tracks", "t1")).toBe("/music/tracks/t1");
    expect(entityHref("genres", "g1")).toBeNull();
  });
});
