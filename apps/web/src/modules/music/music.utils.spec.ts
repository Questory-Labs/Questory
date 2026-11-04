import { describe, expect, it } from "vitest";
import {
  formatClock,
  formatHours,
  formatMonthYear,
  initialOf,
  listeningPhrase,
  playbackProgress,
  playingSourceLabel,
} from "./music.utils";

describe("music utils", () => {
  it("labels playing-now sources", () => {
    expect(playingSourceLabel("lastfm")).toBe("Last.fm");
    expect(playingSourceLabel("listenbrainz")).toBe("ListenBrainz");
    expect(playingSourceLabel("other")).toBe("other");
    expect(playingSourceLabel(null)).toBeNull();
  });

  it("phrases the peak listening hour", () => {
    expect(listeningPhrase(23)).toBe("mostly after dark");
    expect(listeningPhrase(2)).toBe("mostly after dark");
    expect(listeningPhrase(9)).toBe("mostly in the morning");
    expect(listeningPhrase(14)).toBe("mostly in the afternoon");
    expect(listeningPhrase(19)).toBe("mostly in the evening");
    expect(listeningPhrase(null)).toBe("and counting");
  });

  it("formats clocks and hours", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(201_000)).toBe("3:21");
    expect(formatClock(-5)).toBe("0:00");
    expect(formatHours(90)).toBe("1.5");
    expect(formatHours(7260)).toBe("121");
  });

  it("computes playback progress clamped to the track length", () => {
    const start = "2026-10-01T10:00:00.000Z";
    const t0 = Date.parse(start);
    expect(playbackProgress(start, 200_000, t0 + 50_000)).toEqual({
      elapsedMs: 50_000,
      durationMs: 200_000,
      ratio: 0.25,
    });
    expect(playbackProgress(start, 200_000, t0 + 900_000)?.ratio).toBe(1);
    expect(playbackProgress(start, 200_000, t0 - 1_000)?.ratio).toBe(0);
    expect(playbackProgress("nope", 200_000, t0)).toBeNull();
    expect(playbackProgress(start, 0, t0)).toBeNull();
  });

  it("derives initials and month labels", () => {
    expect(initialOf("  flume")).toBe("F");
    expect(initialOf("!!!")).toBe("♪");
    expect(formatMonthYear(null)).toBe("—");
    expect(formatMonthYear("bad")).toBe("—");
    expect(formatMonthYear("2019-03-15T12:00:00.000Z")).toMatch(/2019/);
  });
});
