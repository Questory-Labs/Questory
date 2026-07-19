import { test, expect } from "@playwright/test";

const API = "**/localhost:4000/**";

async function mockUnauthed(page: import("@playwright/test").Page) {
  await page.route(API, async (route) => {
    const url = route.request().url();
    if (url.includes("/auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: null }),
      });
      return;
    }
    await route.fulfill({ status: 401, body: "unauthorized" });
  });
}

test.describe("auth soft gates", () => {
  test("unauthed deep link redirects to landing", async ({ page }) => {
    await mockUnauthed(page);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
  });

  test("music route redirects when feature disabled", async ({ page }) => {
    await mockUnauthed(page);
    await page.goto("/music");
    // NEXT_PUBLIC_ENABLE_MUSIC defaults false → MusicGate → /dashboard → AuthGate → /
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 15_000 });
  });
});

test.describe("authed smoke", () => {
  test("dashboard renders for session user", async ({ page }) => {
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
      if (url.includes("/dashboard")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ stats: {}, playNext: [] }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{}",
      });
    });
    await page.goto("/dashboard");
    await expect(
      page.getByRole("link", { name: "Dashboard" }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
