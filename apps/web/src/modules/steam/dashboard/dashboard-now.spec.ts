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

  it("uses playing-now for a live music card with progress", () => {
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
      now,
    });
    expect(card).toMatchObject({ live: true, badge: "1:00", sub: "2023", sources: ["Lastfm"] });
    expect(card?.progress?.pct).toBe(0.5);
  });

  it("returns null without playing-now or a recent listen", () => {
    expect(musicNowCard({ now })).toBeNull();
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
    expect(card).toMatchObject({ status: "Paused", badge: "40%" });
    expect(card?.progress?.pct).toBe(0.4);
  });

  it("shows chapter progress when the total is known", () => {
    const card = readNowCard({
      id: "r1",
      readAt: "2026-10-27T12:00:00.000Z",
      source: "mangadex",
      progress: 5,
      titleChapters: 20,
      status: "reading",
      title: { id: "b1", name: "Frieren", format: "manga" },
    } as unknown as ReadRecentEvent);
    expect(card).toMatchObject({ badge: "5 / 20", sub: expect.stringContaining("Chapter 5") });
    expect(card?.progress?.pct).toBe(0.25);
    expect(readNowCard(undefined)).toBeNull();
  });
});
