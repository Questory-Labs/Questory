import { describe, expect, it } from "vitest";
import { renderScraperTemplate } from "./scraper-macros";

describe("renderScraperTemplate", () => {
  it("renders page and user macros", () => {
    const url = renderScraperTemplate(
      "https://letterboxd.com/{{user.letterboxdId}}/page/{{page}}/",
      { page: 2, "user.letterboxdId": "username" },
    );
    expect(url).toBe("https://letterboxd.com/username/page/2/");
  });

  it("leaves unknown macros empty", () => {
    expect(renderScraperTemplate("https://x.com/{{user.missing}}", {})).toBe(
      "https://x.com/",
    );
  });
});
