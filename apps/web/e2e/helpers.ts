import type { Page, Route } from "@playwright/test";

/** Match both localhost and 127.0.0.1 (CI sets NEXT_PUBLIC_API_URL to the latter). */
export const API = /https?:\/\/(?:localhost|127\.0\.0\.1):4000\//;

/** Pathname of a mocked API URL (`/v1/library`, `/health`, …). */
export function apiPathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}

export type E2EUser = {
  id: string;
  steamId: string | null;
  email: string;
  isAdmin: boolean;
  personaName: string;
  avatarUrl: string | null;
};

export const E2E_USER: E2EUser = {
  id: "u1",
  steamId: null,
  email: "alice@example.com",
  isAdmin: false,
  personaName: "Alice",
  avatarUrl: null,
};

export const E2E_APP_STATUS = {
  music: { enabled: true },
  watch: { enabled: true },
  read: { enabled: true },
  sources: {
    lastfm: true,
    listenbrainzIngest: true,
    listenbrainzApi: true,
    spotify: true,
    musicbrainz: true,
    musicImports: true,
    trakt: true,
    tmdb: true,
    anilist: true,
    mal: true,
    kitsu: true,
    shikimori: true,
    bangumi: true,
    letterboxdImport: true,
    letterboxdScrape: true,
    watchWebhooks: true,
  },
};

const EMPTY_SEARCH = {
  games: [],
  friends: [],
  collections: [],
  developers: [],
  publishers: [],
  music: { artists: [], albums: [], tracks: [] },
  watch: { movies: [], shows: [] },
  read: { titles: [] },
};

type ApiRouteHandler = (url: string, route: Route) => Promise<boolean>;

/** Minimal authed shell mocks shared by e2e tests (no Steam-linked sync SSE). */
export async function mockAuthedApi(
  page: Page,
  extra?: ApiRouteHandler,
  user: Partial<E2EUser> = {},
) {
  const sessionUser = { ...E2E_USER, ...user };
  await page.route(API, async (route) => {
    const url = route.request().url();
    if (url.includes("/auth/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: sessionUser }),
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
        body: JSON.stringify(EMPTY_SEARCH),
      });
      return;
    }
    if (url.includes("/shell/sync-status") || url.includes("/sync/jobs")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          steam: { active: false, jobs: [] },
          music: null,
          watch: null,
          read: null,
          jobs: [],
        }),
      });
      return;
    }
    if (extra && (await extra(url, route))) {
      return;
    }
    const path = apiPathname(url);
    if (path === "/v1/status" || path === "/status") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(E2E_APP_STATUS),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    });
  });
}
