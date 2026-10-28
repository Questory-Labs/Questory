import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { timePlayedModel } from "../dashboard-time";
import { TimePlayedHero } from "./TimePlayedHero";

const timePlayed = {
  todaySecs: 1800,
  weekSecs: 5400,
  monthSecs: 36000,
  priorWeekSecs: 3600,
  weekHourlySecs: Array.from({ length: 168 }, (_, i) => (i === 50 ? 3600 : 0)),
};
const now = new Date(2026, 9, 28, 14, 30);

describe("TimePlayedHero", () => {
  afterEach(cleanup);

  it("renders hours, average, delta and the chart", () => {
    render(<TimePlayedHero model={timePlayedModel(timePlayed, "week", now)} />);
    expect(screen.getByRole("heading", { name: "Time played" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open sessions" })).toHaveAttribute("href", "/sessions");
    expect(screen.getByText(/on last week/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Hourly play time across the week/ })).toBeInTheDocument();
  });

  it("skips the chart and delta for month", () => {
    render(<TimePlayedHero model={timePlayedModel(timePlayed, "month", now)} />);
    expect(screen.queryByText(/on last week/)).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
