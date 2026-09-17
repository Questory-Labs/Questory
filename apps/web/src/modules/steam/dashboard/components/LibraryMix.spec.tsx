import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { DashboardStats } from "@questorylabs/shared";
import { LibraryMix } from "./LibraryMix";

const stats = (patch: Partial<DashboardStats> = {}): DashboardStats => ({
  librarySize: 10,
  totalPlaytimeHours: 12,
  unplayedCount: 2,
  wishlistCount: 3,
  activeFriends: 4,
  costPerHour: null,
  lifetimeAtCurrent: null,
  currency: "USD",
  nearCompletionCount: 1,
  currentSalesCount: 0,
  recentlyPlayed: [],
  ...patch,
});

describe("LibraryMix", () => {
  afterEach(cleanup);

  it("is played vs unplayed only", () => {
    render(<LibraryMix value={stats()} />);
    expect(screen.getByRole("heading", { name: "Library mix" })).toBeInTheDocument();
    expect(screen.getByText("8 launched · 2 never played")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Library played versus unplayed" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/near complete/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/friends/i)).not.toBeInTheDocument();
  });
});
