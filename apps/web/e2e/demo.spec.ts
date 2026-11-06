import { expect, test, type Page, type Request } from "@playwright/test";
import { API, E2E_APP_STATUS, apiPathname } from "./helpers";

const HOUR = 60 * 60 * 1000;

type DemoApi = { writes: string[]; signedIn: () => boolean };

async function mockDemoApi(page: Page, startMs: number): Promise<DemoApi> {
  let signedIn = false;
  const writes: string[] = [];
  const demoUser = {
    id: "demo",
    steamId: null,
    email: "demo@questorylabs.com",
    isAdmin: false,
    isDemo: true,
    personaName: "Demo",
    avatarUrl: null,
    sessionExpiresAt: new Date(startMs + HOUR).toISOString(),
  };
  const json = (body: unknown, status = 200) => ({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
  await page.route(API, async (route) => {
    const request: Request = route.request();
    const path = apiPathname(request.url());
    if (request.method() !== "GET") writes.push(path);
    if (path === "/auth/demo") {
      signedIn = true;
      await route.fulfill(json({ ok: true, user: demoUser }));
      return;
    }
    if (path === "/auth/logout") {
      signedIn = false;
      await route.fulfill(json({ ok: true }, 201));
      return;
    }
    if (path === "/auth/me") {
      await route.fulfill(json({ user: signedIn ? demoUser : null }));
      return;
    }
    if (path === "/auth/signup-status") {
      await route.fulfill(json({ open: true, reason: "no_admins" }));
      return;
    }
    if (path === "/v1/status" || path === "/status") {
      await route.fulfill(
        json({ ...E2E_APP_STATUS, demo: { enabled: true } }),
      );
      return;
    }
    if (path.endsWith("/notifications/unread-count")) {
      await route.fulfill(json({ count: 1 }));
      return;
    }
    if (path.endsWith("/notifications")) {
      await route.fulfill(json([]));
      return;
    }
    await route.fulfill(json({ message: "Not found" }, 404));
  });
  return { writes, signedIn: () => signedIn };
}

test.describe("demo mode", () => {
  test("hides the button when the flag is off", async ({ page }) => {
    await page.route(API, async (route) => {
      const path = apiPathname(route.request().url());
      const body =
        path === "/v1/status" || path === "/status"
          ? E2E_APP_STATUS
          : path === "/auth/me"
            ? { user: null }
            : {};
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
    await page.goto("/");
    await expect(page.getByRole("heading").first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: "View demo" })).toHaveCount(0);
  });

  test("starts from the landing page, blocks writes, and logs out at expiry", async ({
    page,
  }) => {
    const start = Date.now();
    await page.clock.install({ time: start });
    const api = await mockDemoApi(page, start);

    await page.goto("/");
    await page.getByRole("button", { name: "View demo" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page.getByRole("status").filter({ hasText: "Read-only demo" }))
      .toContainText("min left", { timeout: 15_000 });
    expect(api.writes).toEqual(["/auth/demo"]);

    await page.getByRole("button", { name: /notifications/i }).click();
    await page.getByRole("button", { name: "Mark all read" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Demo is read-only" }))
      .toBeVisible();
    expect(api.writes).toEqual(["/auth/demo"]);

    await page.clock.fastForward(HOUR + 2_000);
    await expect(page).toHaveURL(/\/(?:login)?(?:\?.*)?$/, { timeout: 15_000 });
    await expect.poll(() => api.writes).toContain("/auth/logout");
    expect(api.signedIn()).toBe(false);
  });
});
