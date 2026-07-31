import { test, expect } from "@playwright/test";
import { mockAuthedApi } from "./helpers";

test("httpOnly session cookie is not readable from JS", async ({ page }) => {
  await page.context().addCookies([
    {
      name: "questorylabs_session",
      value: "fake.cookie",
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto("/");
  const readable = await page.evaluate(() => document.cookie);
  expect(readable).not.toContain("questorylabs_session");
});

test("search query with script markup is escaped in UI", async ({ page }) => {
  await mockAuthedApi(page);
  const q = "<img onerror=alert(1)>";
  await page.goto(`/search?q=${encodeURIComponent(q)}`);

  const searchHeader = page.locator("header", {
    has: page.getByRole("heading", { name: "Search", level: 1 }),
  });
  await expect(searchHeader).toBeVisible({ timeout: 15_000 });
  await expect(searchHeader).toContainText("Results for");
  await expect(searchHeader).toContainText(q);

  // Must not create an executable img-onerror node from the query string
  await expect(page.locator("img[onerror]")).toHaveCount(0);
});
