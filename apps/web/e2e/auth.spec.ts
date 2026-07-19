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
    if (url.includes("/auth/signup-status")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ open: true, reason: "no_admins" }),
      });
      return;
    }
    await route.fulfill({ status: 401, body: "unauthorized" });
  });
}

test.describe("auth soft gates", () => {
  test("unauthed deep link redirects to login", async ({ page }) => {
    await mockUnauthed(page);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
  });

  test("landing shows email sign in", async ({ page }) => {
    await mockUnauthed(page);
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("link", { name: "Sign in with Steam" }),
    ).toHaveCount(0);
  });

  test("music route redirects when unauthed", async ({ page }) => {
    await mockUnauthed(page);
    await page.goto("/music");
    await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
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
              steamId: null,
              email: "alice@example.com",
              isAdmin: false,
              personaName: "Alice",
              avatarUrl: null,
            },
          }),
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
