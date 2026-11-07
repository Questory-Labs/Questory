import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

vi.mock("@/components/charts/SketchChartPanel", () => ({
  SketchChartPanel: ({
    title,
    data,
    valueLabel,
    variant,
  }: {
    title: string;
    data: { label: string; count: number }[];
    valueLabel: string;
    variant?: string;
  }) => (
    <figure aria-label={title}>
      <figcaption>{`${valueLabel}|${variant ?? "default"}`}</figcaption>
      <p>{data.map((d) => `${d.label}=${d.count}`).join(",")}</p>
    </figure>
  ),
}));

import { HourDowSources } from "./HourDowSources";

type Props = React.ComponentProps<typeof HourDowSources>;

const ok = { failed: false, empty: false };

const props = (over: Partial<Props> = {}): Props => ({
  hour: ok,
  dow: ok,
  sources: ok,
  hourError: "hour failed",
  dowError: "dow failed",
  sourcesError: "sources failed",
  hourData: [{ key: "09", count: 3 }],
  dowData: [{ label: "Mon", count: 7 }],
  sourceItems: [
    { key: "trakt", label: "Trakt", count: 25 },
    { key: "plex", label: "Plex", count: 75 },
  ],
  valueLabel: "plays",
  periodTotal: 100,
  formatShare: (count, total) => `${(count / total) * 100}%`,
  ...over,
});

const row = (label: string) => screen.getByText(label).closest("li") as HTMLElement;

const barWidth = (label: string) =>
  (row(label).lastElementChild?.firstElementChild as HTMLElement).style.width;

describe("HourDowSources", () => {
  afterEach(cleanup);

  it("renders hour and day charts with default titles", () => {
    render(<HourDowSources {...props()} />);
    expect(screen.getByRole("figure", { name: "Hour of day" })).toBeInTheDocument();
    expect(screen.getByRole("figure", { name: "Day of week" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Sources" })).toBeInTheDocument();
  });

  it("honours custom titles", () => {
    render(<HourDowSources {...props({ hourTitle: "Hours", dowTitle: "Days", sourcesTitle: "Origins" })} />);
    expect(screen.getByRole("figure", { name: "Hours" })).toBeInTheDocument();
    expect(screen.getByRole("figure", { name: "Days" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Origins" })).toBeInTheDocument();
  });

  it("maps rows preferring label, then key, then empty", () => {
    render(
      <HourDowSources
        {...props({
          hourData: [
            { label: "Morning", key: "m", count: 1 },
            { key: "10", count: 2 },
            { count: 3 },
          ],
        })}
      />,
    );
    expect(within(screen.getByRole("figure", { name: "Hour of day" })).getByText("Morning=1,10=2,=3")).toBeInTheDocument();
  });

  it("passes the value label and uses a bar chart only for day of week", () => {
    render(<HourDowSources {...props()} />);
    expect(within(screen.getByRole("figure", { name: "Hour of day" })).getByText("plays|default")).toBeInTheDocument();
    expect(within(screen.getByRole("figure", { name: "Day of week" })).getByText("plays|bar")).toBeInTheDocument();
  });

  describe.each([
    ["hour", "hourError", "hour failed", "Hour of day"],
    ["dow", "dowError", "dow failed", "Day of week"],
  ] as const)("%s panel", (key, _errorKey, message, title) => {
    it("shows the error and drops the chart when failed", () => {
      render(<HourDowSources {...props({ [key]: { failed: true, empty: false } })} />);
      expect(screen.getByText(message)).toBeInTheDocument();
      expect(screen.queryByRole("figure", { name: title })).toBeNull();
    });

    it("shows a titled placeholder while empty", () => {
      render(<HourDowSources {...props({ [key]: { failed: false, empty: true } })} />);
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
      expect(screen.queryByRole("figure", { name: title })).toBeNull();
      expect(screen.queryByText(message)).toBeNull();
    });

    it("prefers the error over the placeholder", () => {
      render(<HourDowSources {...props({ [key]: { failed: true, empty: true } })} />);
      expect(screen.getByText(message)).toBeInTheDocument();
    });
  });

  describe("extra panel", () => {
    const extra = {
      extra: ok,
      extraTitle: "Genres",
      extraError: "genres failed",
      extraData: [{ label: "Drama", count: 4 }],
    };

    it("renders when status, title and error are all given", () => {
      render(<HourDowSources {...props(extra)} />);
      expect(within(screen.getByRole("figure", { name: "Genres" })).getByText("Drama=4")).toBeInTheDocument();
    });

    it.each(["extra", "extraTitle", "extraError"] as const)("is omitted without %s", (missing) => {
      render(<HourDowSources {...props({ ...extra, [missing]: undefined })} />);
      expect(screen.queryByRole("figure", { name: "Genres" })).toBeNull();
    });

    it("tolerates missing data", () => {
      render(<HourDowSources {...props({ ...extra, extraData: undefined })} />);
      expect(screen.getByRole("figure", { name: "Genres" })).toBeInTheDocument();
    });

    it("shows its error when failed", () => {
      render(<HourDowSources {...props({ ...extra, extra: { failed: true, empty: false } })} />);
      expect(screen.getByText("genres failed")).toBeInTheDocument();
      expect(screen.queryByRole("figure", { name: "Genres" })).toBeNull();
    });
  });

  describe("sources list", () => {
    it("shows the count and share for each source", () => {
      render(<HourDowSources {...props()} />);
      expect(within(row("Trakt")).getByText("25 · 25%")).toBeInTheDocument();
      expect(within(row("Plex")).getByText("75 · 75%")).toBeInTheDocument();
    });

    it("sizes bars proportionally", () => {
      render(<HourDowSources {...props()} />);
      expect(barWidth("Trakt")).toBe("25%");
      expect(barWidth("Plex")).toBe("75%");
    });

    it("caps bars at full width when counts exceed the total", () => {
      render(<HourDowSources {...props({ periodTotal: 10, sourceItems: [{ key: "t", label: "Trakt", count: 50 }] })} />);
      expect(barWidth("Trakt")).toBe("100%");
    });

    it("omits the share and empties the bar with a zero total", () => {
      const formatShare = vi.fn();
      render(
        <HourDowSources
          {...props({ periodTotal: 0, formatShare, sourceItems: [{ key: "t", label: "Trakt", count: 5 }] })}
        />,
      );
      expect(within(row("Trakt")).getByText("5")).toBeInTheDocument();
      expect(barWidth("Trakt")).toBe("0%");
      expect(formatShare).not.toHaveBeenCalled();
    });

    it("explains when there is no metadata", () => {
      render(<HourDowSources {...props({ sourceItems: [] })} />);
      expect(screen.getByText("No source metadata yet.")).toBeInTheDocument();
    });

    it("hides the empty note when sources exist", () => {
      render(<HourDowSources {...props()} />);
      expect(screen.queryByText("No source metadata yet.")).toBeNull();
    });

    it("shows the error when failed", () => {
      render(<HourDowSources {...props({ sources: { failed: true, empty: false } })} />);
      expect(screen.getByText("sources failed")).toBeInTheDocument();
      expect(screen.queryByText("Trakt")).toBeNull();
    });

    it("shows a titled placeholder while empty", () => {
      render(<HourDowSources {...props({ sources: { failed: false, empty: true } })} />);
      expect(screen.getByRole("heading", { name: "Sources" })).toBeInTheDocument();
      expect(screen.queryByText("Trakt")).toBeNull();
    });
  });

  it("isolates panel failures from each other", () => {
    render(<HourDowSources {...props({ hour: { failed: true, empty: false } })} />);
    expect(screen.getByText("hour failed")).toBeInTheDocument();
    expect(screen.getByRole("figure", { name: "Day of week" })).toBeInTheDocument();
    expect(screen.getByText("Trakt")).toBeInTheDocument();
  });
});
