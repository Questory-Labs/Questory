import { describe, expect, it } from "vitest";
import {
  letterboxdDateFromParts,
  normalizeLetterboxdScrapeRows,
  yearFromFilmPath,
} from "../../src/watch/letterboxd/letterboxd-row-parse";

describe("letterboxd row parse", () => {
  it("builds ISO dates from month/day/year parts", () => {
    expect(letterboxdDateFromParts("Aug", "15", "2024")).toBe("2024-08-15");
    expect(letterboxdDateFromParts("Jul", "3", "2024")).toBe("2024-07-03");
  });

  it("parses release year from film slug", () => {
    expect(yearFromFilmPath("/film/the-odyssey-2026/")).toBe(2026);
    expect(yearFromFilmPath("/film/fight-club/")).toBeNull();
  });

  it("carries month headers across rows", () => {
    const rows = normalizeLetterboxdScrapeRows([
      {
        title: "Fight Club",
        month: "Aug",
        yearHeader: "2024",
        day: "15",
        rating: "4",
        filmHref: "/film/fight-club/",
      },
      {
        title: "The Matrix",
        month: null,
        yearHeader: null,
        day: "10",
        rating: "5",
        filmHref: "/film/the-matrix/",
      },
    ]);

    expect(rows[0].date).toBe("2024-08-15");
    expect(rows[1].date).toBe("2024-08-10");
  });

  it("prefers month/day parts over a timezone-shifted href date", () => {
    const rows = normalizeLetterboxdScrapeRows([
      {
        title: "Interstellar",
        month: "Aug",
        yearHeader: "2026",
        day: "04",
        date: "2026-08-03",
        filmHref: "/film/interstellar/",
      },
      {
        title: "Spider-Man: Brand New Day",
        month: null,
        yearHeader: null,
        day: "03",
        date: "2026-08-02",
        filmHref: "/film/spider-man-brand-new-day/",
      },
    ]);

    expect(rows[1].date).toBe("2026-08-03");
  });
});
