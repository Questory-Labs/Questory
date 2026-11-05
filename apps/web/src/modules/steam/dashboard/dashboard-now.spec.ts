import { describe, expect, it } from "vitest";
import type { MusicPlayingNow, ReadRecentEvent, WatchRecentEvent } from "@questorylabs/shared";
import { gameNowCard, musicNowCard, readNowCard, watchNowCard } from "./dashboard-now";

const now = new Date("2026-10-28T12:00:00.000Z");

describe("dashboard-now", () => {
  it("labels the game card as Continue with hours played", () => {
    const card = gameNowCard({
      appId: 1,
      name: "Hades",
      headerImage: null,
      playtimeForever: 150,
      lastPlayedAt: null,
    });
    expect(card).toMatchObject({ kind: "Continue", badge: "3h", live: false, href: "/library/1" });
  });

  it("uses playing-now for a live music card without playback progress", () => {
    const card = musicNowCard({
      playingNow: {
        startedAt: "2026-10-28T11:59:00.000Z",
        source: "lastfm",
        track: {
          id: "t1",
          title: "Hurt",
          artistName: "NewJeans",
          releaseTitle: null,
          year: 2023,
          durationMs: 120000,
        },
      } as unknown as MusicPlayingNow,
    });
    expect(card).toMatchObject({ live: true, sub: "2023", sources: ["Lastfm"] });
    expect(card?.badge).toBeUndefined();
    expect(card).not.toHaveProperty("progress");
  });

  it("returns null without playing-now or a recent listen", () => {
    expect(musicNowCard({})).toBeNull();
  });

  it("marks partial watches as paused", () => {
    const card = watchNowCard({
      id: "w1",
      watchedAt: "2026-10-27T12:00:00.000Z",
      source: "trakt",
      progress: 40,
      title: { id: "m1", name: "1917", type: "movie" },
      episode: null,
    } as unknown as WatchRecentEvent);
    expect(card).toMatchObject({ status: "Paused" });
    expect(card?.badge).toBeUndefined();
    expect(card).not.toHaveProperty("progress");
  });

  it("hides chapter progress on read cards", () => {
    const card = readNowCard({
      id: "r1",
      readAt: "2026-10-27T12:00:00.000Z",
      source: "mangadex",
      progress: 5,
      titleChapters: 20,
      status: "reading",
      title: { id: "b1", name: "Frieren", format: "manga" },
    } as unknown as ReadRecentEvent);
    expect(card?.badge).toBeUndefined();
    expect(card?.sub).not.toContain("Chapter");
    expect(card).not.toHaveProperty("progress");
    expect(readNowCard(undefined)).toBeNull();
  });
});
