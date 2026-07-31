import { describe, expect, it } from "vitest";
import {
  ScraperConfigBodySchema,
  ScraperDefinitionSchema,
} from "./scraper-schema";

describe("ScraperDefinitionSchema", () => {
  it("accepts a minimal cheerio config", () => {
    const parsed = ScraperDefinitionSchema.safeParse({
      engine: "cheerio",
      startUrl: "https://example.com/{{user.id}}/page/{{page}}",
      itemSelector: ".item",
      fields: [{ name: "title", selector: ".title" }],
      pagination: {
        type: "urlTemplate",
        urlTemplate: "https://example.com/{{user.id}}/page/{{page}}",
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects configs without fields", () => {
    const parsed = ScraperDefinitionSchema.safeParse({
      engine: "playwright",
      startUrl: "https://example.com",
      itemSelector: ".item",
      fields: [],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("ScraperConfigBodySchema", () => {
  it("accepts letterboxd-shaped body", () => {
    const parsed = ScraperConfigBodySchema.safeParse({
      name: "Letterboxd diary",
      sourceKey: "letterboxd",
      enabled: true,
      config: {
        engine: "cheerio",
        startUrl:
          "https://letterboxd.com/{{user.letterboxdId}}/films/diary/page/{{page}}/",
        itemSelector: "tr.diary-entry-row",
        fields: [
          { name: "title", selector: "a", attr: "text" },
          { name: "date", selector: "a", attr: "href", transform: "date" },
        ],
      },
    });
    expect(parsed.success).toBe(true);
  });
});
