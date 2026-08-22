import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScraperConfigEditor } from "./ScraperConfigEditor";

const baseDraft = {
  name: "Letterboxd",
  sourceKey: "letterboxd",
  enabled: true,
  config: {
    engine: "cheerio" as const,
    startUrl:
      "https://letterboxd.com/{{user.letterboxdId}}/films/diary/page/{{page}}/",
    limits: {
      maxPages: 50,
      maxRequestsPerMinute: 20,
      requestDelayMs: 2000,
      maxRetries: 3,
    },
    itemSelector: "tr.diary-entry-row",
    fields: [
      { name: "title", selector: "a", attr: "text" as const },
      {
        name: "date",
        selector: "a",
        attr: "href" as const,
        transform: "date" as const,
      },
    ],
    pagination: {
      type: "urlTemplate" as const,
      urlTemplate:
        "https://letterboxd.com/{{user.letterboxdId}}/films/diary/page/{{page}}/",
    },
    stop: { onKnownEntry: true },
  },
};

describe("ScraperConfigEditor", () => {
  it("renders engine select and field rows", () => {
    const onChange = vi.fn();
    render(<ScraperConfigEditor draft={baseDraft} onChange={onChange} />);

    expect(screen.getByDisplayValue("cheerio")).toBeInTheDocument();
    expect(screen.getByDisplayValue("tr.diary-entry-row")).toBeInTheDocument();
    expect(screen.getByDisplayValue("title")).toBeInTheDocument();
    expect(screen.getByText("Field rules")).toBeInTheDocument();
  });
});
