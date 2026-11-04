import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReadInsights, ReadLibraryItem, ReadLibraryPage, ReadTitleDetail } from "@questorylabs/shared";
import { mockResource } from "@/test/resource-mock";
import { CurrentlyReading } from "./home/components/CurrentlyReading";
import { ReadCharts } from "./home/components/ReadCharts";
import { ReadKpis } from "./home/components/ReadKpis";
import { LibraryCard } from "./library/components/LibraryCard";
import { ReadShelfTabs } from "./library/components/ReadShelfTabs";
import { StatusChips } from "./library/components/StatusChips";
import { ReadTitleHero } from "./title/components/ReadTitleHero";
import { ReadTitleHistory } from "./title/components/ReadTitleHistory";

const libraryItem = {
  listStatus: "reading",
  progressChapters: 10,
  progressVolumes: 0,
  score: null,
  title: { id: "t1", name: "Berserk", displayName: null, format: "manga", chapters: 40, volumes: null, coverUrl: null, category: null },
} as unknown as ReadLibraryItem;

const insights = {
  periodEvents: 4,
  chaptersLogged: 12,
  newTitles: 2,
  uniqueTitles: 3,
  peakHour: null,
  compare: { previousEvents: 2, deltaPct: 100, previousChapters: 5, chaptersDeltaPct: 140 },
} as unknown as ReadInsights;

const titleDetail = {
  title: { id: "t1", name: "Berserk", displayName: null, format: "manga", chapters: 40, genres: ["Action"], coverUrl: null },
  listStatus: "reading",
  progressChapters: 10,
  progressVolumes: 0,
  score: null,
  pace: null,
  eventCount: 1,
  recentEvents: [{ id: "e1", readAt: "2026-08-01T20:00:00.000Z", source: "anilist", status: "reading", chaptersRead: 10, volumesRead: null }],
} as unknown as ReadTitleDetail;

describe("read components", () => {
  afterEach(cleanup);

  it("CurrentlyReading lists items, hides when empty, and reports errors", () => {
    const page = (items: ReadLibraryItem[]) =>
      mockResource<ReadLibraryPage>({ empty: false, failed: false, value: { items, total: items.length, page: 1, pageSize: 6 } });
    const { container, rerender } = render(<CurrentlyReading reading={page([libraryItem])} />);
    expect(screen.getByRole("link", { name: /Berserk/ })).toHaveAttribute("href", "/read/titles/t1");
    rerender(<CurrentlyReading reading={page([])} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<CurrentlyReading reading={mockResource<ReadLibraryPage>({ empty: true, failed: true })} />);
    expect(screen.getByText("Could not load currently reading.")).toBeInTheDocument();
  });

  it("ReadKpis shows labels and the chapters delta", () => {
    render(<ReadKpis d={insights} rangeLabel="last 30 days" />);
    expect(screen.getByText("Chapters logged")).toBeInTheDocument();
    expect(screen.getByText("+7 vs prior 30 days")).toBeInTheDocument();
    expect(screen.getByText("Unique titles")).toBeInTheDocument();
  });

  it("ReadCharts surfaces per-chart errors", () => {
    const failed = mockResource({ empty: true, failed: true });
    render(
      <ReadCharts
        insights={mockResource({ empty: false, failed: false, value: insights })}
        hour={failed as never}
        dow={failed as never}
        formats={failed as never}
        sources={failed as never}
      />,
    );
    expect(screen.getByText("Could not load hour-of-day events.")).toBeInTheDocument();
    expect(screen.getByText("Could not load formats.")).toBeInTheDocument();
    expect(screen.getByText("Could not load read sources.")).toBeInTheDocument();
    expect(screen.getByText("Could not load day-of-week events.")).toBeInTheDocument();
  });

  it("LibraryCard links to the title with status", () => {
    render(<LibraryCard item={libraryItem} index={0} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/read/titles/t1");
    expect(screen.getByText("Berserk")).toBeInTheDocument();
  });

  it("ReadShelfTabs marks the active view", () => {
    render(<ReadShelfTabs active="history" />);
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Library" })).toHaveAttribute("href", "/read/library");
  });

  it("StatusChips shows counts and reports changes", () => {
    const onChange = vi.fn();
    render(
      <StatusChips
        value=""
        counts={[
          { status: "reading", count: 2 },
          { status: "completed", count: 3 },
        ]}
        onChange={onChange}
      />,
    );
    const group = screen.getByRole("group", { name: "Status" });
    expect(group).toHaveTextContent("5");
    const reading = screen.getAllByRole("button").find((b) => b.textContent?.includes("2"));
    fireEvent.click(reading!);
    expect(onChange).toHaveBeenCalledWith("reading");
  });

  it("ReadTitleHero logs the next chapter and shows the message", () => {
    const onLogChapter = vi.fn();
    render(<ReadTitleHero d={titleDetail} onLogChapter={onLogChapter} logMessage={{ tone: "ok", text: "Logged." }} />);
    fireEvent.click(screen.getByRole("button", { name: "Log chapter 11" }));
    expect(onLogChapter).toHaveBeenCalledWith(11);
    expect(screen.getByText("Logged.")).toBeInTheDocument();
    expect(screen.getByText(/30 chapters to go/)).toBeInTheDocument();
  });

  it("ReadTitleHistory renders the heading and weekly error", () => {
    render(<ReadTitleHistory d={titleDetail} weeks={mockResource({ empty: true, failed: true }) as never} />);
    expect(screen.getByRole("heading", { name: "Reading history" })).toBeInTheDocument();
    expect(screen.getByText("Could not load weekly reading.")).toBeInTheDocument();
  });
});
