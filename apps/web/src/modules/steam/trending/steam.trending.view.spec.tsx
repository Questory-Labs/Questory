import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { TrendingResponse } from "@questorylabs/shared";
import { TrendingView } from "./steam.trending.view";

vi.mock("@/components/FamilyGameSidebar", () => ({
  FamilyGameSidebar: () => null,
}));

const reload = async () => undefined;

const resource = <T,>(
  patch: Partial<UseResourceResult<T>> &
    Pick<UseResourceResult<T>, "empty" | "failed">,
): UseResourceResult<T> =>
  ({
    value: undefined,
    error: patch.failed ? new Error("fail") : null,
    busy: false,
    refreshing: false,
    updatedAt: 0,
    reload,
    ready: !patch.empty && !patch.failed,
    ...patch,
  }) as UseResourceResult<T>;

const game = {
  appId: 1,
  name: "Hades",
  headerImage: null,
  rank: 1,
  friendCount: 2,
  totalPlaytimeMinutes: 120,
  sampleFriends: [],
};

const steamShelf = (games = [game]) =>
  resource<TrendingResponse["global"]>({
    empty: false,
    failed: false,
    value: {
      games,
      meta: { rollupDate: "2026-09-01T00:00:00.000Z", source: "steam_charts" },
    },
  });

const friends = resource<TrendingResponse["friends"]>({
  empty: false,
  failed: false,
  value: {
    games: [game],
    meta: {
      friendsTotal: 2,
      friendsSampled: 2,
      friendsWithData: 2,
      friendsFailed: 0,
      cached: false,
      truncated: false,
      windowDays: 14,
    },
  },
});

const chart = resource({
  empty: false,
  failed: false,
  value: {
    games: [game],
    meta: { source: "steam_charts", lastUpdate: null, pageName: null, period: null, rollupDate: null },
  },
});

describe("TrendingView", () => {
  afterEach(() => cleanup());

  it("leads with global most played and keeps friends last", () => {
    render(
      <TrendingView
        {...({
          friends,
          global: steamShelf(),
          concurrent: chart,
          deck: chart,
          topReleases: chart,
          showMusic: false,
          showWatch: false,
          showRead: false,
          showEnterprise: false,
          selectedAppId: null,
          setSelectedAppId: () => undefined,
        } as Record<string, unknown>)}
      />,
    );
    const headings = screen.getAllByRole("heading").map((el) => el.textContent);
    expect(headings[0]).toBe("Trending");
    expect(headings.slice(1, 6)).toEqual([
      "Global most played",
      "Playing now",
      "Top releases",
      "Steam Deck most played",
      "Among friends",
    ]);
  });

  it("adds AniList as trending now, not last week", () => {
    render(
      <TrendingView
        {...({
          friends,
          global: steamShelf(),
          concurrent: chart,
          deck: chart,
          topReleases: chart,
          showMusic: false,
          showWatch: false,
          showRead: true,
          showEnterprise: false,
          read: resource({
            empty: false,
            failed: false,
            value: {
              items: [
                {
                  id: "42",
                  name: "One Piece",
                  imageUrl: null,
                  rank: 1,
                },
              ],
              meta: { source: "anilist", windowLabel: "Trending now" },
            },
          }),
          selectedAppId: null,
          setSelectedAppId: () => undefined,
        } as Record<string, unknown>)}
      />,
    );
    expect(screen.getByRole("heading", { name: "AniList trending now" })).toBeInTheDocument();
    expect(
      screen.getByText(/Public manga ranking right now/i),
    ).toBeInTheDocument();
  });

  it("shows a danger empty state when the weekly digest fails", () => {
    render(
      <TrendingView
        {...({
          friends,
          global: steamShelf(),
          concurrent: chart,
          deck: chart,
          topReleases: chart,
          showMusic: false,
          showWatch: false,
          showRead: false,
          showEnterprise: true,
          digest: resource({ empty: true, failed: true }),
          selectedAppId: null,
          setSelectedAppId: () => undefined,
        } as Record<string, unknown>)}
      />,
    );
    expect(screen.getByText("Could not load weekly overlap.")).toBeInTheDocument();
  });
});
