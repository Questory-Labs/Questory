import { describe, expect, it } from "vitest";
import {
  mapAniListListStatus,
  mapAniListMangaFormat,
  mangaProgressPercent,
} from "../../src/read/anilist/manga-map";

describe("mapAniListMangaFormat", () => {
  it("maps known AniList formats", () => {
    expect(mapAniListMangaFormat("MANGA")).toBe("manga");
    expect(mapAniListMangaFormat("MANHWA")).toBe("manhwa");
    expect(mapAniListMangaFormat("MANHUA")).toBe("manhua");
    expect(mapAniListMangaFormat("NOVEL")).toBe("novel");
    expect(mapAniListMangaFormat("ONE_SHOT")).toBe("one_shot");
  });

  it("falls back to other", () => {
    expect(mapAniListMangaFormat("UNKNOWN")).toBe("other");
    expect(mapAniListMangaFormat(null)).toBe("other");
  });
});

describe("mapAniListListStatus", () => {
  it("maps list statuses", () => {
    expect(mapAniListListStatus("CURRENT")).toBe("reading");
    expect(mapAniListListStatus("COMPLETED")).toBe("completed");
    expect(mapAniListListStatus("PLANNING")).toBe("planning");
    expect(mapAniListListStatus("PAUSED")).toBe("paused");
    expect(mapAniListListStatus("DROPPED")).toBe("dropped");
    expect(mapAniListListStatus("REPEATING")).toBe("repeating");
  });
});

describe("mangaProgressPercent", () => {
  it("returns 100 when completed", () => {
    expect(mangaProgressPercent(3, 100, "COMPLETED")).toBe(100);
  });

  it("uses chapter ratio when known", () => {
    expect(mangaProgressPercent(5, 20, "CURRENT")).toBe(25);
  });

  it("uses heuristic when chapters unknown", () => {
    expect(mangaProgressPercent(4, null, "CURRENT")).toBe(50);
    expect(mangaProgressPercent(0, null, "CURRENT")).toBe(0);
  });
});
