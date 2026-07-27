import { test, expect } from "@playwright/test";

const API = "**/localhost:4000/**";

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
  await page.route(API, async (route) => {
    const url = route.request().url();
    if (url.includes("/auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "u1",
            steamId: "76561198000000000",
            personaName: "Alice",
            avatarUrl: null,
          },
        }),
      });
      return;
    }
    if (url.includes("/sync/jobs")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ jobs: [] }),
      });
      return;
    }
    if (url.includes("/notifications/unread-count")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ count: 0 }),
      });
      return;
    }
    if (url.includes("/search")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ games: [], friends: [], collections: [] }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    });
  });
  const q = "<img onerror=alert(1)>";
  await page.goto(`/search?q=${encodeURIComponent(q)}`);
  await expect(page.getByText(`Results for “${q}”`)).toBeVisible({
    timeout: 15_000,
  });
  // Must not create an executable img-onerror node from the query string
  await expect(page.locator('img[onerror]')).toHaveCount(0);
});
