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

  it("stays compact when there is no chart", () => {
    const empty = { ...timePlayed, weekSecs: 0, weekHourlySecs: Array.from({ length: 168 }, () => 0) };
    render(<TimePlayedHero model={timePlayedModel(empty, "week", now)} />);
    const section = screen.getByRole("heading", { name: "Time played" }).closest("section");
    expect(section).not.toHaveClass("flex-1");
    expect(section?.querySelector("p")).toHaveClass("text-[46px]");
    expect(screen.getByText(/on last week/)).toBeInTheDocument();
  });

  it("grows to fill the column when there is a chart", () => {
    render(<TimePlayedHero model={timePlayedModel(timePlayed, "week", now)} />);
    const section = screen.getByRole("heading", { name: "Time played" }).closest("section");
    expect(section).toHaveClass("flex-1");
    expect(section?.querySelector("p")).toHaveClass("text-[64px]");
  });
});
