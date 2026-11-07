import { describe, expect, it } from "vitest";
import {
  letterboxdAdjacentDateStrs,
  letterboxdAdjacentScrapeCsvPair,
  letterboxdDatesOneDayApart,
  letterboxdDateStrFromDedupeKey,
  letterboxdEquivKeyFromDedupeKey,
  letterboxdRepairGroupKey,
  letterboxdWatchDedupeKey,
  letterboxdWatchEquivKey,
  normalizeLetterboxdName,
  parseLegacyLetterboxdDedupeKey,
  shiftLetterboxdDateStr,
  watchedAtDateStr,
  watchedAtDayUtc,
  type LetterboxdRepairEvent,
} from "../../src/watch/imports/letterboxd-keys";
import {
  letterboxdDateFromParts,
  normalizeLetterboxdScrapeRows,
  yearFromFilmPath,
} from "../../src/watch/letterboxd/letterboxd-row-parse";

const NOON = new Date("2024-03-10T12:00:00.000Z");

describe("letterboxd key primitives", () => {
  it("collapses all whitespace runs in names", () => {
    expect(normalizeLetterboxdName("  A \t  Film\nHere ")).toBe("a-film-here");
  });

  it("anchors watches at UTC noon", () => {
    expect(watchedAtDayUtc("2024-03-10")?.toISOString()).toBe(
      "2024-03-10T12:00:00.000Z",
    );
  });

  it.each(["", "garbage", "2024-13-01", "2024-02-32", "10/03/2024"])(
    "returns null for unparseable date %j",
    (input) => {
      expect(watchedAtDayUtc(input)).toBeNull();
    },
  );

  it("formats a Date back to its UTC day", () => {
    expect(watchedAtDateStr(new Date("2024-03-10T23:59:59.000Z"))).toBe(
      "2024-03-10",
    );
  });

  it.each([
    [null, ""],
    [undefined, ""],
    [Number.NaN, ""],
    [Number.POSITIVE_INFINITY, ""],
    [1999, "1999"],
  ])("renders year %s as segment %j", (year, segment) => {
    expect(letterboxdWatchDedupeKey("Film", year, "2024-03-10")).toBe(
      `letterboxd_csv:watch:film:${segment}:2024-03-10`,
    );
  });

  it("builds a year-agnostic equivalence key", () => {
    expect(letterboxdWatchEquivKey(" The  Film ", "2024-03-10")).toBe(
      "the-film:2024-03-10",
    );
  });

  it.each([
    "letterboxd_csv:watch:film:1999:2024-03-10",
    "letterboxd_csv:ratings:film:2024-03-10",
    "letterboxd_csv:diary:film:not-a-date",
    "letterboxd_csv:diary:film",
    "other:diary:film:2024-03-10",
    "",
  ])("does not treat %j as a legacy key", (key) => {
    expect(parseLegacyLetterboxdDedupeKey(key)).toBeNull();
  });
});

describe("letterboxdEquivKeyFromDedupeKey", () => {
  it("prefers the date in a legacy key over watchedAt", () => {
    expect(
      letterboxdEquivKeyFromDedupeKey(
        "letterboxd_csv:watched:the-film:2024-01-01",
        "Ignored",
        NOON,
      ),
    ).toBe("the-film:2024-01-01");
  });

  it("drops the year segment from canonical keys", () => {
    expect(
      letterboxdEquivKeyFromDedupeKey(
        "letterboxd_csv:watch:the-film:1999:2024-01-01",
        "Ignored",
        NOON,
      ),
    ).toBe("the-film:2024-01-01");
  });

  it("falls back to title and watchedAt for foreign keys", () => {
    expect(letterboxdEquivKeyFromDedupeKey("scrape:123", "The Film", NOON)).toBe(
      "the-film:2024-03-10",
    );
  });

  it("matches scrape equivalence for titles containing a colon", () => {
    const key = letterboxdWatchDedupeKey("Mission: Impossible", 1996, "2024-03-10");
    expect(
      letterboxdEquivKeyFromDedupeKey(key, "Mission: Impossible", NOON),
    ).toBe(letterboxdWatchEquivKey("Mission: Impossible", "2024-03-10"));
  });
});

describe("letterboxdRepairGroupKey", () => {
  it("scopes groups by user", () => {
    const key = "letterboxd_csv:watch:film:1999:2024-03-10";
    expect(letterboxdRepairGroupKey("u1", key, "Film", NOON)).not.toBe(
      letterboxdRepairGroupKey("u2", key, "Film", NOON),
    );
  });

  it("separates foreign keys from recognised keys", () => {
    expect(letterboxdRepairGroupKey("u1", "scrape:1", "Film", NOON)).toBe(
      "u1:fallback:film:2024-03-10",
    );
    expect(
      letterboxdRepairGroupKey(
        "u1",
        "letterboxd_csv:watch:film:1999:2024-03-10",
        "Film",
        NOON,
      ),
    ).toBe("u1:repair:film:2024-03-10");
  });
});

describe("letterboxd date helpers", () => {
  it("reads dates from legacy, canonical and foreign keys", () => {
    expect(
      letterboxdDateStrFromDedupeKey(
        "letterboxd_csv:diary:film:2024-01-01",
        NOON,
      ),
    ).toBe("2024-01-01");
    expect(
      letterboxdDateStrFromDedupeKey(
        "letterboxd_csv:watch:film::2024-01-02",
        NOON,
      ),
    ).toBe("2024-01-02");
    expect(letterboxdDateStrFromDedupeKey("scrape:1", NOON)).toBe("2024-03-10");
  });

  it.each([
    ["2024-03-01", -1, "2024-02-29"],
    ["2023-03-01", -1, "2023-02-28"],
    ["2023-12-31", 1, "2024-01-01"],
    ["2024-01-01", 0, "2024-01-01"],
  ])("shifts %s by %i to %s", (input, delta, expected) => {
    expect(shiftLetterboxdDateStr(input, delta)).toBe(expected);
  });

  it("returns null when shifting an invalid date", () => {
    expect(shiftLetterboxdDateStr("nope", 1)).toBeNull();
  });

  it("drops neighbours for an invalid date", () => {
    expect(letterboxdAdjacentDateStrs("nope")).toEqual(["nope"]);
    expect(letterboxdAdjacentDateStrs("2024-01-01")).toEqual([
      "2024-01-01",
      "2023-12-31",
      "2024-01-02",
    ]);
  });

  it.each([
    ["2024-01-01", "2024-01-01", false],
    ["2024-01-01", "2024-01-02", true],
    ["2024-01-02", "2024-01-01", true],
    ["2024-01-01", "2024-01-03", false],
    ["2023-12-31", "2024-01-01", true],
    ["nope", "2024-01-01", false],
    ["2024-01-01", "nope", false],
  ])("compares %s and %s as adjacent=%s", (a, b, expected) => {
    expect(letterboxdDatesOneDayApart(a, b)).toBe(expected);
  });
});

describe("letterboxdAdjacentScrapeCsvPair", () => {
  const event = (
    source: string,
    dateStr: string,
  ): LetterboxdRepairEvent => ({
    id: `${source}-${dateStr}`,
    userId: "u1",
    dedupeKey: `letterboxd_csv:watch:film:1999:${dateStr}`,
    watchedAt: new Date(`${dateStr}T12:00:00.000Z`),
    source,
    title: { name: "Film" },
  });

  it("is symmetric for a scrape and CSV pair", () => {
    const scrape = event("letterboxd", "2024-01-01");
    const csv = event("letterboxd_csv", "2024-01-02");
    expect(letterboxdAdjacentScrapeCsvPair(scrape, csv)).toBe(true);
    expect(letterboxdAdjacentScrapeCsvPair(csv, scrape)).toBe(true);
  });

  it.each([
    ["two scrapes", "letterboxd", "letterboxd"],
    ["two CSV rows", "letterboxd_csv", "letterboxd_csv"],
    ["an unrelated source", "trakt", "letterboxd_csv"],
  ])("rejects %s", (_label, a, b) => {
    expect(
      letterboxdAdjacentScrapeCsvPair(
        event(a, "2024-01-01"),
        event(b, "2024-01-02"),
      ),
    ).toBe(false);
  });

  it("rejects the same day and gaps above one day", () => {
    const scrape = event("letterboxd", "2024-01-01");
    expect(
      letterboxdAdjacentScrapeCsvPair(scrape, event("letterboxd_csv", "2024-01-01")),
    ).toBe(false);
    expect(
      letterboxdAdjacentScrapeCsvPair(scrape, event("letterboxd_csv", "2024-01-03")),
    ).toBe(false);
  });
});

describe("yearFromFilmPath", () => {
  it.each([
    [null, null],
    [undefined, null],
    ["", null],
    ["/film/the-film/", null],
    ["/film/blade-runner-2049-remake/", null],
    ["/film/the-film-99/", null],
    ["/film/the-film-1999", 1999],
    ["/film/the-film-1999/", 1999],
    ["https://letterboxd.com/user/film/the-film-1999/", 1999],
    ["https://letterboxd.com/film/the-film-1999/?ref=x", 1999],
  ])("reads %j as %j", (href, expected) => {
    expect(yearFromFilmPath(href)).toBe(expected);
  });
});

describe("letterboxdDateFromParts", () => {
  it.each([
    [null, "1", "2024"],
    ["Jan", null, "2024"],
    ["Jan", "1", null],
    ["  ", "1", "2024"],
    ["Jan", "  ", "2024"],
    ["Jan", "1", "  "],
    ["Smarch", "1", "2024"],
    ["Jan", "1", "24"],
    ["Jan", "1", "abcd"],
  ])("returns null for %j %j %j", (month, day, year) => {
    expect(letterboxdDateFromParts(month, day, year)).toBeNull();
  });

  it.each([
    ["JAN", "1", "2024", "2024-01-01"],
    ["december", "31", "2023", "2023-12-31"],
    [" Sep ", " 9 ", " 2024 ", "2024-09-09"],
  ])("builds a date from %j %j %j", (month, day, year, expected) => {
    expect(letterboxdDateFromParts(month, day, year)).toBe(expected);
  });
});

describe("normalizeLetterboxdScrapeRows", () => {
  it("returns an empty list for no rows", () => {
    expect(normalizeLetterboxdScrapeRows([])).toEqual([]);
  });

  it("does not mutate its input", () => {
    const row = { title: "Film", rating: null };
    const copy = { ...row };
    normalizeLetterboxdScrapeRows([row]);
    expect(row).toEqual(copy);
  });

  it("uses the alternate href when the primary is blank", () => {
    const [row] = normalizeLetterboxdScrapeRows([
      { filmHref: "  ", filmHrefAlt: "/film/film-2001/" },
    ]);
    expect(row.filmHref).toBe("/film/film-2001/");
    expect(row.year).toBe("2001");
  });

  it("prefers a numeric title year over the href year", () => {
    const [row] = normalizeLetterboxdScrapeRows([
      { year: "1999", filmHref: "/film/film-2001/" },
    ]);
    expect(row.year).toBe("1999");
  });

  it("falls back to the href when the title year is not numeric", () => {
    const [row] = normalizeLetterboxdScrapeRows([
      { year: "n/a", filmHref: "/film/film-2001/" },
    ]);
    expect(row.year).toBe("2001");
  });

  it("nulls the year when no source has one", () => {
    const [row] = normalizeLetterboxdScrapeRows([{ year: "n/a" }]);
    expect(row.year).toBeNull();
  });

  it("uses the explicit date when headers are incomplete", () => {
    const [row] = normalizeLetterboxdScrapeRows([
      { month: "Jan", day: "2", date: " 2024-05-06 " },
    ]);
    expect(row.date).toBe("2024-05-06");
  });

  it("nulls the date when nothing supplies it", () => {
    const [row] = normalizeLetterboxdScrapeRows([{ day: "2" }]);
    expect(row.date).toBeNull();
  });

  it("carries year headers independently of month headers", () => {
    const rows = normalizeLetterboxdScrapeRows([
      { month: "Dec", yearHeader: "2023", day: "31" },
      { month: "Jan", yearHeader: "2024", day: "1" },
      { day: "2" },
    ]);
    expect(rows.map((r) => r.date)).toEqual([
      "2023-12-31",
      "2024-01-01",
      "2024-01-02",
    ]);
  });

  it("falls back from rating to ratingClass", () => {
    const rows = normalizeLetterboxdScrapeRows([
      { rating: " 4 ", ratingClass: "2" },
      { rating: "  ", ratingClass: " 3 " },
      { rating: null, ratingClass: null },
    ]);
    expect(rows.map((r) => r.rating)).toEqual(["4", "3", null]);
  });
});
