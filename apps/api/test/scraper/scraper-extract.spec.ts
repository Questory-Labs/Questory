import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as cheerio from "cheerio";
import { describe, expect, it } from "vitest";
import { extractPageItems } from "../../src/scraper/scraper-extract";
import { applyFieldTransform } from "../../src/scraper/scraper-transforms";
import { LETTERBOXD_SCRAPER_DEFINITION } from "../../src/scraper/letterboxd-default-config";
import { normalizeLetterboxdScrapeRows } from "../../src/watch/letterboxd/letterboxd-row-parse";

const fixture = readFileSync(
  resolve(__dirname, "fixtures/letterboxd-diary.html"),
  "utf8",
);

describe("scraper transforms", () => {
  it("parses letterboxd rated class", () => {
    expect(applyFieldTransform("ratedClass", "rating rated-8")).toBe("4");
  });

  it("parses star glyphs", () => {
    expect(applyFieldTransform("stars", "★★★★")).toBe("4");
    expect(applyFieldTransform("stars", "★★★★★")).toBe("5");
  });

  it("parses letterboxd date href", () => {
    expect(
      applyFieldTransform(
        "letterboxdDateHref",
        "/username/films/diary/for/2024/aug/15/",
      ),
    ).toBe("2024-08-15");
    expect(
      applyFieldTransform(
        "letterboxdDateHref",
        "/santoshpanna/diary/films/for/2026/08/03/",
      ),
    ).toBe("2026-08-03");
    expect(
      applyFieldTransform(
        "letterboxdDateHref",
        "/santoshpanna/diary/films/for/2026/07/22/",
      ),
    ).toBe("2026-07-22");
  });

  it("extracts slug from film href", () => {
    expect(
      applyFieldTransform("slugFromHref", "/film/fight-club/"),
    ).toBe("fight-club");
  });
});

describe("letterboxd diary extraction", () => {
  it("extracts rows from current diary markup", () => {
    const $ = cheerio.load(fixture);
    const rows = normalizeLetterboxdScrapeRows(
      extractPageItems(
        $ as never,
        LETTERBOXD_SCRAPER_DEFINITION.itemSelector,
        LETTERBOXD_SCRAPER_DEFINITION.fields,
      ),
    );
    expect(rows).toHaveLength(3);
    expect(rows[0].title).toBe("Fight Club");
    expect(rows[0].date).toBe("2024-08-15");
    expect(rows[0].rating).toBe("4");
    expect(rows[1].title).toBe("The Matrix");
    expect(rows[1].date).toBe("2024-08-10");
    expect(rows[1].rating).toBe("5");
    expect(rows[2].title).toBe("The Odyssey");
    expect(rows[2].date).toBe("2024-07-03");
    expect(rows[2].year).toBe("2026");
    expect(rows[2].rating).toBe("4");
  });
});
