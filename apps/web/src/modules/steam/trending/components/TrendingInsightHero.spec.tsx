import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { WeeklyDigestView } from "@questorylabs/shared";
import { TrendingInsightHero } from "./TrendingInsightHero";

const reload = async () => undefined;

const resource = (
  patch: Partial<UseResourceResult<WeeklyDigestView>> &
    Pick<UseResourceResult<WeeklyDigestView>, "empty" | "failed">,
): UseResourceResult<WeeklyDigestView> =>
  ({
    value: undefined,
    error: patch.failed ? new Error("fail") : null,
    busy: false,
    refreshing: false,
    updatedAt: 0,
    reload,
    ready: !patch.empty && !patch.failed,
    ...patch,
  }) as UseResourceResult<WeeklyDigestView>;

describe("TrendingInsightHero", () => {
  afterEach(cleanup);

  it("renders nothing when the insight failed", () => {
    const { container } = render(
      <TrendingInsightHero digest={resource({ empty: true, failed: true })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("hides an empty finished insight instead of overlap copy", () => {
    const { container } = render(
      <TrendingInsightHero
        digest={resource({
          empty: false,
          failed: false,
          value: {
            cached: true,
            generating: false,
            result: {
              weekId: "2026-W37",
              from: "2026-09-07",
              to: "2026-09-13",
              headline: "",
              body: "",
              llmPolished: false,
              items: [],
            },
          },
        })}
      />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Last week vs the world")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Nothing from your week made the public charts/i),
    ).not.toBeInTheDocument();
  });

  it("shows a checking state while the insight is generating", () => {
    render(
      <TrendingInsightHero
        digest={resource({
          empty: false,
          failed: false,
          busy: true,
          value: { cached: false, generating: true, result: null },
        })}
      />,
    );
    expect(
      screen.getByRole("heading", {
        name: "Reading the charts against what you've been on",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Trending insight")).toBeInTheDocument();
  });

  it("does not show heuristic overlap as an insight while generating", () => {
    render(
      <TrendingInsightHero
        digest={resource({
          empty: false,
          failed: false,
          value: {
            cached: true,
            generating: true,
            result: {
              weekId: "2026-W38",
              from: "2026-09-14",
              to: "2026-09-20",
              headline: "3 titles from your last month are on the public charts",
              body: "You spent time on these recently, and they showed up on worldwide charts.",
              llmPolished: false,
              items: [
                {
                  domain: "games",
                  name: "Counter-Strike 2",
                  reason:
                    "You spent time on this in the last month — it's also on Steam Charts.",
                  chartLabel: "Steam Charts",
                },
              ],
            },
          },
        })}
      />,
    );
    expect(screen.getByText("Trending insight")).toBeInTheDocument();
    expect(screen.queryByText("Counter-Strike 2")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/3 titles from your last month/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Reading the charts against what you've been on",
      }),
    ).toBeInTheDocument();
  });

  it("hides unfinished overlap copy when generation has stopped", () => {
    const { container } = render(
      <TrendingInsightHero
        digest={resource({
          empty: false,
          failed: false,
          value: {
            cached: true,
            generating: false,
            result: {
              weekId: "2026-W38",
              from: "2026-09-14",
              to: "2026-09-20",
              headline: "3 titles from your last month are on the public charts",
              body: "You spent time on these recently, and they showed up on worldwide charts.",
              llmPolished: false,
              items: [
                {
                  domain: "games",
                  name: "Counter-Strike 2",
                  reason:
                    "You spent time on this in the last month — it's also on Steam Charts.",
                  chartLabel: "Steam Charts",
                },
              ],
            },
          },
        })}
      />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Counter-Strike 2")).not.toBeInTheDocument();
  });

  it("shows the checking state when a cached empty result is still generating", () => {
    render(
      <TrendingInsightHero
        digest={resource({
          empty: false,
          failed: false,
          value: {
            cached: true,
            generating: true,
            result: {
              weekId: "2026-W38",
              from: "2026-09-14",
              to: "2026-09-20",
              headline: "",
              body: "",
              llmPolished: false,
              items: [],
            },
          },
        })}
      />,
    );
    expect(
      screen.getByRole("heading", {
        name: "Reading the charts against what you've been on",
      }),
    ).toBeInTheDocument();
  });

  it("lists hook citations from the API copy", () => {
    render(
      <TrendingInsightHero
        digest={resource({
          empty: false,
          failed: false,
          value: {
            cached: true,
            generating: false,
            result: {
              weekId: "2026-W37",
              from: "2026-09-07",
              to: "2026-09-13",
              headline: "Hades is still in your rotation",
              body: "You played Hades this month and it is still on Steam Charts.",
              llmPolished: true,
              items: [
                {
                  domain: "games",
                  name: "Hades",
                  reason: "You played this recently — rank 2 on Steam Charts.",
                  chartLabel: "Steam Charts",
                },
              ],
            },
          },
        })}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Hades is still in your rotation" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Hades")).toBeInTheDocument();
    expect(screen.getByText("Steam Charts")).toBeInTheDocument();
    expect(screen.queryByText("Last week vs the world")).not.toBeInTheDocument();
  });
});
