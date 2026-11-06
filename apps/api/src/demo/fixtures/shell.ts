import {
  DEMO_USER_ID,
  FEATURE_SOURCES,
  type AppNotification,
  type AppStatus,
  type ConnectionsOverview,
  type MeResponse,
  type NavCounts,
  type QmonitorDeviceList,
  type SourcesOverview,
  type StoreAccountStatus,
  type SyncJob,
} from "@questorylabs/shared";
import { PRICE_REGIONS } from "../../lib/currency";
import { DEMO_STEAM_ID, demoUser } from "../demo-user";
import type { DemoRoute } from "../demo.types";
import { LIBRARY_GAMES, WISHLIST_GAMES, textParam } from "./games-catalog";
import { daysAgo } from "./helpers";
import { searchRoutes } from "./shell-search";

const LAST_SYNC_DAYS = 0.1;
const ACTIVE_GOALS = 3;

function appStatus(): AppStatus {
  return {
    music: { enabled: true },
    watch: { enabled: true },
    read: { enabled: true },
    sources: Object.fromEntries(
      FEATURE_SOURCES.map((source) => [source, true]),
    ) as AppStatus["sources"],
    demo: { enabled: true },
  };
}

function stores(exp: number): StoreAccountStatus[] {
  return [
    {
      store: "steam",
      connected: true,
      syncEnabled: true,
      status: "connected",
      displayName: "Demo Player",
      externalUserId: demoUser(exp).steamId,
      lastSyncedAt: daysAgo(LAST_SYNC_DAYS),
    },
    {
      store: "epic",
      connected: false,
      syncEnabled: false,
      status: "coming_later",
      displayName: null,
      externalUserId: null,
      lastSyncedAt: null,
    },
    {
      store: "gog",
      connected: false,
      syncEnabled: false,
      status: "coming_later",
      displayName: null,
      externalUserId: null,
      lastSyncedAt: null,
    },
  ];
}

function syncJobs(): SyncJob[] {
  return ["library-sync", "wishlist-sync", "metadata-refresh"].map((type, index) => ({
    id: `demo-sync-${index + 1}`,
    type,
    status: "completed",
    error: null,
    startedAt: daysAgo(LAST_SYNC_DAYS + 0.01),
    finishedAt: daysAgo(LAST_SYNC_DAYS),
  }));
}

function notifications(): AppNotification[] {
  return [
    {
      id: "demo-notification-1",
      type: "deal",
      title: "Slay the Spire is 75% off",
      body: "A game on your wishlist just hit a strong price.",
      href: "/wishlist",
      readAt: null,
      createdAt: daysAgo(0.3),
    },
    {
      id: "demo-notification-2",
      type: "monthly-recap",
      title: "Your monthly rewind is ready",
      body: "See what you played, heard, watched, and read last month.",
      href: "/library/rewind",
      readAt: daysAgo(2),
      createdAt: daysAgo(3),
    },
    {
      id: "demo-notification-3",
      type: "deal",
      title: "Disco Elysium is 60% off",
      body: "A game on your wishlist just hit a strong price.",
      href: "/wishlist",
      readAt: daysAgo(4),
      createdAt: daysAgo(5),
    },
  ];
}

function connections(): ConnectionsOverview {
  const lastSyncedAt = daysAgo(LAST_SYNC_DAYS);
  return {
    accounts: [
      {
        provider: "steam",
        externalId: DEMO_STEAM_ID,
        displayName: "Demo Player",
        linkedAt: daysAgo(30),
      },
    ],
    sources: [
      { id: "demo-source-lastfm", domain: "music", provider: "lastfm", status: "connected", lastSyncedAt },
      { id: "demo-source-trakt", domain: "watch", provider: "trakt", status: "connected", lastSyncedAt },
      { id: "demo-source-anilist", domain: "read", provider: "anilist", status: "connected", lastSyncedAt },
    ],
    apiKeys: [],
    qmonitorDeviceCount: 0,
    lastSyncedAt,
  };
}

function provider(name: string, connected: boolean, kind: "connection" | "api_key" = "connection") {
  return {
    provider: name,
    kind,
    connected,
    lastSyncedAt: connected ? daysAgo(LAST_SYNC_DAYS) : null,
    lastError: null,
    account: connected ? "Demo Player" : null,
  };
}

function sources(): SourcesOverview {
  return {
    connected: 3,
    domains: [
      {
        domain: "music",
        connected: 1,
        providers: [provider("lastfm", true), provider("music_ingest", false, "api_key")],
      },
      {
        domain: "watch",
        connected: 1,
        providers: [
          provider("trakt", true),
          ...["anilist", "mal", "kitsu", "bangumi", "shikimori", "letterboxd"].map((name) =>
            provider(name, false),
          ),
          provider("watch_webhook", false, "api_key"),
        ],
      },
      {
        domain: "read",
        connected: 1,
        providers: [
          provider("anilist", true),
          ...["mal", "kitsu", "bangumi", "shikimori"].map((name) => provider(name, false)),
        ],
      },
    ],
  };
}

function navCounts(): NavCounts {
  return {
    library: LIBRARY_GAMES.length,
    wishlist: WISHLIST_GAMES.length,
    musicListens: 4820,
    watchTitles: 64,
    readTitles: 38,
    activeGoals: ACTIVE_GOALS,
    connectedSources: 3,
  };
}

function providerSync() {
  return { connected: true, syncing: false, lastSyncedAt: daysAgo(LAST_SYNC_DAYS) };
}

function disconnectedSync() {
  return { connected: false, syncing: false, lastSyncedAt: null };
}

function requested(query: Record<string, unknown>, key: string): boolean {
  return ["1", "true", "yes"].includes(textParam(query[key]).toLowerCase());
}

function shellSyncStatus(query: Record<string, unknown>) {
  const steam = query.steam === undefined || requested(query, "steam");
  const none = disconnectedSync;
  return {
    steam: steam ? { active: false, jobs: syncJobs() } : null,
    music: requested(query, "music") ? { active: false, job: null } : null,
    watch: requested(query, "watch")
      ? {
          active: false,
          letterboxd: null,
          trakt: providerSync(),
          anilist: none(),
          mal: none(),
          kitsu: none(),
          bangumi: none(),
          shikimori: none(),
        }
      : null,
    read: requested(query, "read")
      ? {
          active: false,
          anilist: providerSync(),
          mal: none(),
          kitsu: none(),
          bangumi: none(),
          shikimori: none(),
        }
      : null,
  };
}

function me(exp: number): MeResponse {
  return { user: demoUser(exp) };
}

export const shellRoutes: DemoRoute[] = [
  { method: "GET", pattern: "/auth/me", respond: ({ exp }) => me(exp) },
  {
    method: "GET",
    pattern: "/auth/session-check",
    respond: ({ exp }) => ({ userId: DEMO_USER_ID, steamId: demoUser(exp).steamId }),
  },
  {
    method: "GET",
    pattern: "/auth/signup-status",
    respond: () => ({ open: false, reason: "disabled" }),
  },
  { method: "GET", pattern: "/status", respond: () => appStatus() },
  {
    method: "GET",
    pattern: "/enterprise/status",
    respond: () => ({ available: true, service: { ok: true } }),
  },
  { method: "GET", pattern: "/users/me", respond: ({ exp }) => me(exp) },
  { method: "GET", pattern: "/users/price-regions", respond: () => PRICE_REGIONS },
  { method: "GET", pattern: "/users/me/import/active", respond: () => null },
  {
    method: "GET",
    pattern: "/users/me/export",
    respond: () => ({
      status: "none",
      inProgress: false,
      downloadReady: false,
      fileName: null,
      byteSize: null,
      expiresAt: null,
      lastError: null,
      createdAt: null,
      completedAt: null,
    }),
  },
  { method: "GET", pattern: "/connections", respond: () => connections() },
  { method: "GET", pattern: "/sources", respond: () => sources() },
  { method: "GET", pattern: "/stores", respond: ({ exp }) => stores(exp) },
  { method: "GET", pattern: "/api-keys", respond: () => [] },
  {
    method: "GET",
    pattern: "/api-keys/identity",
    respond: ({ exp }) => ({
      steamId: demoUser(exp).steamId,
      listenbrainzUsername: null,
      keys: [],
      nativeScrobbling: false,
    }),
  },
  { method: "GET", pattern: "/notifications", respond: () => notifications() },
  {
    method: "GET",
    pattern: "/notifications/unread-count",
    respond: () => ({
      count: notifications().filter((item) => item.readAt === null).length,
    }),
  },
  {
    method: "GET",
    pattern: "/qmonitor/devices",
    respond: () => ({ devices: [] }) satisfies QmonitorDeviceList,
  },
  {
    method: "GET",
    pattern: "/recap/settings",
    respond: () => ({ monthly: true, global: true }),
  },
  { method: "GET", pattern: "/shell/nav-counts", respond: () => navCounts() },
  {
    method: "GET",
    pattern: "/shell/sync-status",
    respond: ({ query }) => shellSyncStatus(query),
  },
  { method: "GET", pattern: "/sync/jobs", respond: () => ({ jobs: syncJobs() }) },
  {
    method: "GET",
    pattern: "/sync/catalog",
    respond: () => ({
      lastAppId: null,
      ifModifiedSince: null,
      lastSyncedAt: daysAgo(LAST_SYNC_DAYS),
      lastPageCount: 1000,
      totalApps: 184000,
      status: "idle",
      error: null,
    }),
  },
  ...searchRoutes,
];
