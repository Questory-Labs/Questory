import { describe, expect, it } from "vitest";
import type { MusicMoversResponse } from "@questorylabs/shared";
import {
  concentrationSentence,
  entityHref,
  moverBadge,
  parseKind,
} from "./music.charts.utils";

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
  it("formats mover badges", () => {
    expect(moverBadge(true, null)).toEqual({ text: "New", up: true });
    expect(moverBadge(false, 11)).toEqual({ text: "▲ 11", up: true });
    expect(moverBadge(false, -3)).toEqual({ text: "▼ 3", up: false });
  });

  it("describes concentration against the previous period", () => {
    const data = (share: number, previousShare: number | null) =>
      ({
        concentration: { topN: 10, share, previousShare, delta: null },
      }) as MusicMoversResponse;
    expect(concentrationSentence(data(58, 49), "artists", "month")).toBe(
      "Your top 10 artists make up 58% of listens, up from 49% last month.",
    );
    expect(concentrationSentence(data(40, 49), "artists", "week")).toBe(
      "Your top 10 artists make up 40% of listens, down from 49% last week.",
    );
    expect(concentrationSentence(data(40, null), "tracks", "all")).toBe(
      "Your top 10 tracks make up 40% of listens.",
    );
  });
});
