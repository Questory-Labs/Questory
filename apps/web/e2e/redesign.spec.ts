import { test, expect, type Page } from "@playwright/test";
import { API, apiPathname, mockAuthedApi } from "./helpers";

const DASHBOARD_STATS = {
  librarySize: 10,
  totalPlaytimeHours: 12,
  unplayedCount: 2,
  wishlistCount: 3,
  activeFriends: 4,
  nearCompletionCount: 1,
  currentSalesCount: 2,
  costPerHour: 1.5,
  lifetimeAtCurrent: 40,
  currency: "USD",
  recentlyPlayed: [
    {
      appId: 1,
      name: "Hades",
      headerImage: null,
      playtimeForever: 180,
      lastPlayedAt: "2026-09-11T12:00:00.000Z",
    },
  ],
};

const PLAY_NEXT = [
  {
    appId: 2,
    name: "Celeste",
    headerImage: null,
    playtimeForever: 40,
    lastPlayedAt: null,
    score: 1,
    reasons: ["genre fit"],
    genres: ["Action"],
  },
  {
    appId: 3,
    name: "Hades II",
    headerImage: null,
    playtimeForever: 20,
    lastPlayedAt: null,
    score: 0.8,
    reasons: ["Deck fit"],
    genres: ["Action"],
  },
];

const TRENDING_GAME = {
  appId: 1,
  name: "Hades",
  headerImage: "https://cdn.example/hades.jpg",
  friendCount: 2,
  totalPlaytimeMinutes: 120,
  sampleFriends: [],
};

const FRIENDS_SHELF = {
  games: [TRENDING_GAME],
  meta: {
    friendsTotal: 4,
    friendsSampled: 4,
    friendsWithData: 2,
    friendsFailed: 0,
    cached: false,
    truncated: false,
    windowDays: 14,
  },
};

const LIBRARY_LIST = {
  total: 1,
  page: 1,
  pageSize: 48,
  items: [
    {
      id: "entry-1",
      playtimeForever: 120,
      stores: ["steam"],
      ownerships: [{ store: "steam", playtimeForever: 120, listing: null }],
      game: {
        id: "game-1",
        appId: 1,
        name: "Hades",
        headerImage: "https://cdn.example/hades.jpg",
        genres: ["Action"],
        categories: [],
        tags: [],
        developers: [],
        publishers: [],
        currentPrice: 9.99,
      },
    },
  ],
};

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/test",
  "/test/400",
  "/test/403",
  "/test/404",
  "/test/500",
];

const APP_ROUTES = [
  "/dashboard",
  "/library",
  "/library/game-1",
  "/wishlist",
  "/cost",
  "/friends",
  "/friends/76561198000000000",
  "/family",
  "/multiplayer",
  "/sessions",
  "/collections",
  "/collections/c1",
  "/trending",
  "/search",
  "/settings/profile",
  "/settings/connections",
  "/settings/stores",
  "/music",
  "/music/listening",
  "/music/charts",
  "/music/rewind",
  "/music/settings",
  "/music/tracks/1",
  "/music/albums/1",
  "/music/artists/1",
  "/watch",
  "/watch/history",
  "/watch/rewind",
  "/watch/settings",
  "/watch/titles/1",
  "/read",
  "/read/library",
  "/read/history",
  "/read/rewind",
  "/read/settings",
  "/read/titles/1",
  "/recommendations",
  "/recommendations/goals",
  "/music/insights",
  "/watch/insights",
  "/read/insights",
];

const ADMIN_ROUTES = [
  "/admin",
  "/admin/users",
  "/admin/cron",
  "/admin/migrations",
  "/admin/enrichment",
  "/admin/scrapers",
  "/admin/settings",
  "/admin/telemetry",
  "/admin/guardrails",
];

async function mockUnauthed(page: Page) {
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
    if (url.includes("/auth/challenge")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          challengeId: "c1",
          issuedAt: 1,
          expiresAt: Date.now() + 60_000,
          token: "t",
        }),
      });
      return;
    }
    await route.fulfill({ status: 401, body: "unauthorized" });
  });
}

const MEDIA_RUNTIME_FLAGS = {
  NEXT_PUBLIC_ENABLE_MUSIC: "true",
  NEXT_PUBLIC_ENABLE_WATCH: "true",
  NEXT_PUBLIC_ENABLE_READ: "true",
} as const;

/** Keep media flags on after `/runtime-env.js` assigns `window.__QUESTORY_RUNTIME__`. */
async function enableMediaFlags(page: Page) {
  await page.route("**/runtime-env.js", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `window.__QUESTORY_RUNTIME__=Object.assign(window.__QUESTORY_RUNTIME__||{},${JSON.stringify(
        MEDIA_RUNTIME_FLAGS,
      )});\n`,
    });
  });
  await page.addInitScript((flags) => {
    const merge = (value: unknown) => ({
      ...(value && typeof value === "object"
        ? (value as Record<string, string>)
        : {}),
      ...flags,
    });
    let current = merge(window.__QUESTORY_RUNTIME__);
    Object.defineProperty(window, "__QUESTORY_RUNTIME__", {
      configurable: true,
      enumerable: true,
      get() {
        return current;
      },
      set(value) {
        current = merge(value);
      },
    });
  }, MEDIA_RUNTIME_FLAGS);
}

function json(route: { fulfill: (r: object) => Promise<void> }, body: unknown) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockRedesignApi(page: Page, user: { isAdmin?: boolean } = {}) {
  await enableMediaFlags(page);
  await mockAuthedApi(
    page,
    async (url, route) => {
    const path = apiPathname(url);
    if (url.includes("/health")) {
      await json(route, {
        ok: true,
        music: { enabled: true },
        watch: { enabled: true },
        read: { enabled: true },
      });
      return true;
    }
    if (url.includes("/shell/sync-status") || url.includes("/sync/jobs")) {
      await json(route, {
        steam: { active: false, jobs: [] },
        music: null,
        watch: null,
        read: null,
        jobs: [],
      });
      return true;
    }
    if (url.includes("/dashboard/stats")) {
      await json(route, DASHBOARD_STATS);
      return true;
    }
    if (url.includes("/dashboard/play-next")) {
      await json(route, PLAY_NEXT);
      return true;
    }
    if (url.includes("/analytics/insights")) {
      if (url.includes("/music/")) {
        await json(route, {
          range: "week",
          periodListens: 12,
          peakHour: null,
          peakDow: null,
          topGenre: null,
          topMood: null,
          listeningMinutes: 40,
          listensWithDuration: 10,
          durationCoverage: 80,
          newArtists: 1,
          newTracks: 2,
          topTrackShare: 0.2,
          uniqueArtists: 4,
          uniqueTracks: 6,
          serviceBreakdown: [],
          compare: { previousListens: 10, deltaPct: 20 },
        });
        return true;
      }
      if (url.includes("/watch/")) {
        await json(route, {
          range: "week",
          type: "all",
          periodWatches: 3,
          peakHour: null,
          peakDow: null,
          topGenre: null,
          watchingMinutes: 90,
          watchesWithRuntime: 3,
          runtimeCoverage: 100,
          newTitles: 1,
          topTitleShare: 0.4,
          uniqueTitles: 2,
          movieWatches: 1,
          showWatches: 2,
          movieMinutes: 30,
          showMinutes: 60,
          uniqueMovies: 1,
          uniqueShows: 1,
          sourceBreakdown: [],
          compare: { previousWatches: 2, deltaPct: 50 },
        });
        return true;
      }
      if (url.includes("/read/")) {
        await json(route, {
          range: "week",
          format: "all",
          periodEvents: 4,
          peakHour: null,
          peakDow: null,
          topGenre: null,
          chaptersLogged: 8,
          newTitles: 1,
          topTitleShare: 0.3,
          uniqueTitles: 2,
          formatBreakdown: [],
          statusBreakdown: [],
          sourceBreakdown: [],
          compare: { previousEvents: 3, deltaPct: 33 },
        });
        return true;
      }
    }
    if (url.includes("/analytics/recent")) {
      await json(route, { total: 0, page: 1, pageSize: 5, items: [] });
      return true;
    }
    if (url.includes("/analytics/playing-now")) {
      await json(route, null);
      return true;
    }
    if (
      url.includes("/music/trending") ||
      url.includes("/watch/trending") ||
      url.includes("/read/trending")
    ) {
      await json(route, {
        items: [],
        meta: { source: "mock", windowLabel: "test", from: null, to: null },
      });
      return true;
    }
    if (url.includes("/trending/friends")) {
      await json(route, FRIENDS_SHELF);
      return true;
    }
    if (url.includes("/trending/")) {
      await json(route, {
        games: [],
        meta: {
          friendsTotal: 0,
          friendsSampled: 0,
          friendsWithData: 0,
          friendsFailed: 0,
          cached: false,
          truncated: false,
          windowDays: 14,
          rollupDate: null,
          source: "steam_charts",
        },
      });
      return true;
    }
    if (path === "/v1/family/insights") {
      await json(route, {
        memberCount: 0,
        totalUniqueGames: 0,
        overlapCount: 0,
        duplicatePurchases: 0,
        familyValue: 0,
        suggestedPurchaser: null,
        members: [],
        conflicts: [],
      });
      return true;
    }
    if (path === "/v1/family/library") {
      await json(route, {
        total: 0,
        page: 1,
        pageSize: 15,
        meSteamId: "76561198000000000",
        members: [],
        items: [],
      });
      return true;
    }
    if (path === "/v1/library") {
      await json(route, LIBRARY_LIST);
      return true;
    }
    if (url.includes("/cost/summary")) {
      await json(route, {
        lifetimeSpending: 0,
        lifetimeAtCurrent: 40,
        lifetimeAtLowest: 28,
        pricedGameCount: 4,
        librarySize: 10,
        usingStoreEstimates: true,
        currency: "USD",
        costPerHour: 1.5,
        moneyWasted: 12,
        neverPlayedCount: 2,
        underOneHourCount: 1,
        underOneHourValue: 5,
        salePurchaseCount: 0,
        averageDiscount: 0,
        totalHours: 12,
        paidGameCount: 8,
        freeGameCount: 2,
        unplayedValue: 8,
        playtimeBuckets: [{ name: "10–50h", amount: 40, count: 2 }],
        libraryMix: { paid: { count: 8, amount: 40 }, free: { count: 2 } },
        shelfware: [
          {
            gameId: "game-idle",
            appId: 4,
            name: "Unplayed Epic",
            headerImage: null,
            stores: ["steam"],
            amount: 8,
            currentPrice: 8,
            lowestPrice: 4,
            hours: 0,
            costPerHour: null,
            priceSource: "store",
          },
        ],
        byGenre: [{ genre: "Action", amount: 40 }],
        byPublisher: [{ publisher: "Valve", amount: 40 }],
      });
      return true;
    }
    if (url.includes("/cost/roi")) {
      await json(route, {
        items: [
          {
            gameId: "game-1",
            appId: 1,
            name: "Hades",
            headerImage: null,
            stores: ["steam"],
            amount: 10,
            currentPrice: 9.99,
            lowestPrice: 5,
            hours: 20,
            costPerHour: 0.5,
            priceSource: "store",
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      });
      return true;
    }
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: "not mocked" }),
    });
    return true;
    },
    {
      steamId: "76561198000000000",
      isAdmin: Boolean(user.isAdmin),
    },
  );
}

async function assertNoGlassCrash(page: Page) {
  await expect(page.getByText("The quest log glitched")).toHaveCount(0);
  await expect(page.getByText("Application error")).toHaveCount(0);
  const blurred = await page.locator("[class*='backdrop-blur']").count();
  expect(blurred).toBe(0);
}

test.describe("redesign public", () => {
  test("landing is a numbered site with hatch CTAs", async ({ page }) => {
    await mockUnauthed(page);
    await page.goto("/");
    await expect(page.getByText("/01")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
    await assertNoGlassCrash(page);
  });

  test("login and register use hatch fields", async ({ page }) => {
    await mockUnauthed(page);
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel("Email")).toHaveClass(/field/);
    await page.goto("/register");
    await expect(page.getByLabel("Email")).toHaveClass(/field/);
    await expect(page.getByLabel("Password", { exact: true })).toHaveClass(/field/);
  });

  test("public routes render at desktop and 390px", async ({ page }) => {
    test.setTimeout(120_000);
    await mockUnauthed(page);
    for (const width of [1280, 390] as const) {
      await page.setViewportSize({ width, height: 844 });
      for (const path of PUBLIC_ROUTES) {
        await page.goto(path);
        await expect(page.locator("body")).toBeVisible({ timeout: 15_000 });
        if (path === "/test/500") {
          await expect(
            page.getByRole("heading", { name: "The quest log glitched" }),
          ).toBeVisible();
          continue;
        }
        await assertNoGlassCrash(page);
      }
    }
  });
});

test.describe("redesign authed", () => {
  test("dashboard mix legend, rail labels, and glance", async ({ page }) => {
    await mockRedesignApi(page);
    await page.goto("/dashboard");
    await expect(page.getByRole("navigation", { name: "Primary" })).toContainText(
      "Dashboard",
      { timeout: 15_000 },
    );
    await expect(page.getByRole("heading", { name: "Continue" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Play next" })).toBeVisible();
    await expect(page.getByText("Played: 8", { exact: true })).toBeVisible();
    await expect(page.getByText("Unplayed: 2", { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: "Library played versus unplayed" })).toBeVisible();
    await expect(page.getByText("Near complete")).toBeVisible();
    await expect(page.getByText("Cost / hour")).toBeVisible();
    await assertNoGlassCrash(page);
  });

  test("cost page hero, unplayed list, and one ranking", async ({ page }) => {
    await mockRedesignApi(page);
    await page.goto("/cost");
    await expect(page.getByRole("heading", { name: "Library cost" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Estimated library value")).toBeVisible();
    await expect(page.getByText("8 paid")).toBeVisible();
    await expect(page.getByText("Genre")).toBeVisible();
    await expect(page.getByText("Action")).toBeVisible();
    await expect(page.getByText("Value by hours")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Unplayed" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Best value" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("link", { name: /Hades/ })).toBeVisible();
    await page.getByRole("tab", { name: "Least value" }).click();
    await expect(page.getByText("Highest first")).toBeVisible();
    await page.setViewportSize({ width: 390, height: 900 });
    await expect(page.getByText("Estimated library value")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Paid" })).toBeVisible();
    await assertNoGlassCrash(page);
  });

  test("library filters are designed fields; tile names stay in captions", async ({
    page,
  }) => {
    await mockRedesignApi(page);
    await page.goto("/library");
    await expect(page.getByPlaceholder("Any")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByPlaceholder("Any")).toHaveClass(/field/);
    const tile = page.getByRole("link", { name: /Hades/ }).first();
    await expect(tile).toBeVisible();
    const cover = tile.locator(".aspect-\\[460\\/215\\]");
    await expect(cover).not.toContainText("Hades");
    await expect(tile).toContainText("Hades");
  });

  test("trending overlay names stay off the cover", async ({ page }) => {
    await mockRedesignApi(page);
    await page.goto("/trending");
    const tile = page.getByRole("button", { name: /Hades/ }).first();
    await expect(tile).toBeVisible({ timeout: 15_000 });
    await expect(tile.locator(".aspect-\\[460\\/215\\]")).not.toContainText("Hades");
    await expect(tile).toContainText("Hades");
  });

  test("reduced-motion does not leave tile entrance opacity", async ({ page }) => {
    await mockRedesignApi(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/library");
    await expect(page.getByRole("link", { name: /Hades/ }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("[style*='opacity: 0']")).toHaveCount(0);
  });

  test("music pages live in the primary nav", async ({ page }) => {
    await mockRedesignApi(page);
    await page.goto("/music/listening");
    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link", { name: "Listening" })).toHaveAttribute(
      "aria-current",
      "page",
      { timeout: 15_000 },
    );
    await expect(nav.getByRole("link", { name: "Charts" })).toBeVisible();
  });

  test("app routes render at desktop and ~390px", async ({ page }) => {
    test.setTimeout(240_000);
    await mockRedesignApi(page);
    for (const width of [1280, 390] as const) {
      await page.setViewportSize({ width, height: 844 });
      for (const path of APP_ROUTES) {
        await page.goto(path);
        await expect(page.locator("body")).toBeVisible({ timeout: 15_000 });
        const crashed = await page.getByText("The quest log glitched").count();
        if (crashed) {
          throw new Error(`Unhandled 500 at ${path} (${page.url()})`);
        }
        await assertNoGlassCrash(page);
      }
      if (width === 390) {
        await page.goto("/dashboard");
        await page.getByRole("button", { name: "Open menu" }).click();
        await expect(page.getByRole("navigation", { name: "Mobile" })).toContainText(
          "Dashboard",
        );
        await expect(page.getByRole("navigation", { name: "Mobile" })).toContainText(
          "Library",
        );
      } else {
        await page.goto("/dashboard");
        await expect(page.getByRole("navigation", { name: "Primary" })).toContainText(
          "Dashboard",
        );
      }
    }
  });

  test("admin routes use labeled hatch rail", async ({ page }) => {
    test.setTimeout(120_000);
    await mockRedesignApi(page, { isAdmin: true });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/admin");
    await expect(page.getByRole("navigation", { name: "Admin" })).toContainText(
      "Users",
      { timeout: 15_000 },
    );
    await assertNoGlassCrash(page);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ADMIN_ROUTES) {
      await page.goto(path);
      await expect(page.locator("body")).toBeVisible({ timeout: 15_000 });
      await assertNoGlassCrash(page);
    }
  });
});
