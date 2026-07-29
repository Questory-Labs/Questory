import { describe, expect, it } from "vitest";
import {
  malAnimeProgressPercent,
  malMangaProgressPercent,
  mapMalListStatus,
} from "../../src/read/mal/mal-map";
import {
  mapShikimoriListStatus,
  shikimoriAnimeProgress,
} from "../../src/read/shikimori/shikimori-map";
import {
  bangumiAnimeProgress,
  mapBangumiCollectionType,
} from "../../src/read/bangumi/bangumi-map";
import { mapKitsuListStatus, kitsuAnimeProgress } from "../../src/read/kitsu/kitsu-map";

describe("mal-map", () => {
  it("maps MAL list status to read status", () => {
    expect(mapMalListStatus("reading")).toBe("reading");
    expect(mapMalListStatus("plan_to_read")).toBe("planning");
  });

  it("computes anime progress", () => {
    expect(malAnimeProgressPercent(10, 20, "watching")).toBe(50);
    expect(malAnimeProgressPercent(0, 20, "completed")).toBe(100);
  });

  it("computes manga progress", () => {
    expect(malMangaProgressPercent(5, 10, "reading")).toBe(50);
  });
});

describe("shikimori-map", () => {
  it("maps planned to planning", () => {
    expect(mapShikimoriListStatus("planned")).toBe("planning");
  });

  it("computes anime progress", () => {
    expect(shikimoriAnimeProgress(3, 12, "watching")).toBe(25);
  });
});

describe("bangumi-map", () => {
  it("maps collection types", () => {
    expect(mapBangumiCollectionType("wish")).toBe("planning");
    expect(mapBangumiCollectionType("do")).toBe("reading");
  });

  it("computes anime progress", () => {
    expect(bangumiAnimeProgress(6, 12, "do")).toBe(50);
    expect(bangumiAnimeProgress(0, 12, "collect")).toBe(100);
  });
});

describe("kitsu-map", () => {
  it("maps current to reading", () => {
    expect(mapKitsuListStatus("current")).toBe("reading");
  });

  it("computes progress", () => {
    expect(kitsuAnimeProgress(4, 8, "current")).toBe(50);
  });
});
