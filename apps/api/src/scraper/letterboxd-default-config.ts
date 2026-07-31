import type { ScraperDefinition } from "@questorylabs/shared";

/** Default Letterboxd diary scraper — admin can clone/edit in /admin/scrapers. */
export const LETTERBOXD_SCRAPER_DEFINITION: ScraperDefinition = {
  engine: "cheerio",
  startUrl:
    "https://letterboxd.com/{{user.letterboxdId}}/diary/films/by/date/page/{{page}}/",
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  limits: {
    maxPages: 50,
    maxRequestsPerMinute: 20,
    requestDelayMs: 2000,
    maxRetries: 3,
  },
  itemSelector: "tr.diary-entry-row",
  fields: [
    {
      name: "title",
      selector:
        "h2.primaryname a, h2.name a, td.colfilm .headline-2 a, td.colfilm p.name a",
      attr: "text",
      regex: "^(.+?)(?:\\s*\\(\\d{4}\\))?$",
    },
    {
      name: "year",
      selector:
        "h2.primaryname a, h2.name a, td.colfilm .headline-2 a, td.colfilm p.name a",
      attr: "text",
      regex: "\\((\\d{4})\\)",
      transform: "number",
    },
    {
      name: "filmHref",
      selector: ".js-td-production[data-item-link]",
      attr: "attr",
      attrName: "data-item-link",
    },
    {
      name: "filmHrefAlt",
      selector: "h2.primaryname a, h2.name a, td.colfilm .headline-2 a",
      attr: "href",
    },
    {
      name: "month",
      selector: ".col-monthdate .month",
      attr: "text",
    },
    {
      name: "yearHeader",
      selector: ".col-monthdate .year",
      attr: "text",
    },
    {
      name: "day",
      selector: ".col-daydate .daydate, td.colday a",
      attr: "text",
      regex: "^(\\d{1,2})$",
    },
    {
      name: "date",
      selector: "td.colday a, .col-daydate a",
      attr: "href",
      transform: "letterboxdDateHref",
    },
    {
      name: "rating",
      selector: ".col-rating .rating, td.colrating span.rating, td.td-rating span",
      attr: "text",
      transform: "stars",
    },
    {
      name: "ratingClass",
      selector: ".col-rating .rating, td.colrating span, td.td-rating span",
      attr: "class",
      transform: "ratedClass",
    },
    {
      name: "slug",
      selector: "h2.primaryname a, h2.name a, td.colfilm .headline-2 a",
      attr: "href",
      transform: "slugFromHref",
    },
  ],
  pagination: {
    type: "urlTemplate",
    urlTemplate:
      "https://letterboxd.com/{{user.letterboxdId}}/diary/films/by/date/page/{{page}}/",
  },
  stop: { onKnownEntry: true },
};

export const LETTERBOXD_SCRAPER_TEMPLATE = {
  name: "Letterboxd diary",
  sourceKey: "letterboxd",
  enabled: true,
  config: LETTERBOXD_SCRAPER_DEFINITION,
};

export function isStaleLetterboxdScraperConfig(configJson: string): boolean {
  return (
    configJson.includes("/films/diary/") ||
    !configJson.includes("/diary/films/")
  );
}
