import type {
  Collection,
  LibraryEntry,
  LibraryFacets,
  LibraryListResponse,
} from "@questorylabs/shared";
import type { DemoRoute } from "../demo.types";
import {
  DEMO_CURRENCY,
  LIBRARY_GAMES,
  findOwnedGame,
  metaFor,
  ownedProfile,
  paginate,
  textParam,
  toLibraryEntry,
} from "./games-catalog";
import { daysAgo, steamHeaderUrl } from "./helpers";

const LIBRARY_PAGE_SIZE = 24;
const COLLECTION_PAGE_SIZE = 15;
const COLLECTION_COVERS = 4;
const THROWBACK_DAYS = 180;

type LibraryGame = (typeof LIBRARY_GAMES)[number];

type CollectionDef = {
  id: string;
  name: string;
  type: "auto" | "custom";
  ruleKey: string | null;
  description: string;
  color: string | null;
  updatedDays: number;
  match: (game: LibraryGame) => boolean;
};

const hasGenre = (game: LibraryGame, genre: string) =>
  (game.genres as readonly string[]).includes(genre);

const COLLECTIONS: readonly CollectionDef[] = [
  {
    id: "demo-collection-never-played",
    name: "Never Played",
    type: "auto",
    ruleKey: "never_played",
    description: "Games still waiting for their first launch",
    color: null,
    updatedDays: 1,
    match: (game) => game.minutes === 0,
  },
  {
    id: "demo-collection-weekend",
    name: "Weekend Games",
    type: "auto",
    ruleKey: "weekend_games",
    description: "Co-op and party-friendly picks",
    color: null,
    updatedDays: 1,
    match: (game) => hasGenre(game, "Co-op"),
  },
  {
    id: "demo-collection-roguelikes",
    name: "Roguelikes",
    type: "auto",
    ruleKey: "roguelikes",
    description: "Roguelike and roguelite games",
    color: null,
    updatedDays: 2,
    match: (game) => hasGenre(game, "Roguelike"),
  },
  {
    id: "demo-collection-near-completion",
    name: "Near Completion",
    type: "auto",
    ruleKey: "near_completion",
    description: "Most achievements already unlocked",
    color: null,
    updatedDays: 2,
    match: (game) =>
      ownedProfile(game.appId).unlocked / metaFor(game.appId).achievementTotal >= 0.8,
  },
  {
    id: "demo-collection-forgotten",
    name: "Forgotten Favourites",
    type: "auto",
    ruleKey: "forgotten_favourites",
    description: "Lots of hours, not played in six months",
    color: null,
    updatedDays: 3,
    match: (game) => (ownedProfile(game.appId).lastPlayedDays ?? 0) >= THROWBACK_DAYS,
  },
  {
    id: "demo-collection-deck",
    name: "Steam Deck Ready",
    type: "auto",
    ruleKey: "steam_deck_ready",
    description: "Verified or playable on Deck",
    color: null,
    updatedDays: 3,
    match: () => true,
  },
  {
    id: "demo-collection-cozy",
    name: "Cozy Evenings",
    type: "custom",
    ruleKey: null,
    description: "Low-stress games for winding down",
    color: "#34d399",
    updatedDays: 12,
    match: (game) => game.name === "Stardew Valley" || game.name === "Terraria" || game.name === "Portal 2",
  },
  {
    id: "demo-collection-big-rpgs",
    name: "Big RPG Nights",
    type: "custom",
    ruleKey: null,
    description: "Long campaigns worth clearing a weekend for",
    color: "#f59e0b",
    updatedDays: 20,
    match: (game) => hasGenre(game, "RPG"),
  },
];

function gamesFor(def: CollectionDef): LibraryGame[] {
  return LIBRARY_GAMES.filter(def.match).sort((a, b) => a.name.localeCompare(b.name));
}

export function collectionSummaries(): Collection[] {
  return COLLECTIONS.map((def) => {
    const games = gamesFor(def);
    return {
      id: def.id,
      name: def.name,
      type: def.type,
      ruleKey: def.ruleKey,
      gameCount: games.length,
      description: def.description,
      color: def.color,
      updatedAt: daysAgo(def.updatedDays),
      covers: games.slice(0, COLLECTION_COVERS).map((game) => steamHeaderUrl(game.appId)),
    };
  });
}

function compareEntries(sort: string) {
  return (a: LibraryEntry, b: LibraryEntry) => {
    if (sort === "hours") return b.playtimeForever - a.playtimeForever;
    if (sort === "name") return a.game.name.localeCompare(b.game.name);
    if (sort === "valuePerHour") {
      return (a.costPerHour ?? Number.POSITIVE_INFINITY) - (b.costPerHour ?? Number.POSITIVE_INFINITY);
    }
    return (b.lastPlayedAt ?? "").localeCompare(a.lastPlayedAt ?? "");
  };
}

function facetsFor(entries: LibraryEntry[]): LibraryFacets {
  const countStatus = (status: string) =>
    entries.filter((entry) => entry.userStatus === status).length;
  return {
    all: entries.length,
    neverPlayed: entries.filter((entry) => entry.playtimeForever === 0).length,
    playing: countStatus("playing"),
    backlog: countStatus("backlog"),
    finished: countStatus("finished"),
    dropped: countStatus("dropped"),
  };
}

function matchesStatus(entry: LibraryEntry, status: string): boolean {
  if (!status) return true;
  if (status === "neverPlayed") return entry.playtimeForever === 0;
  return entry.userStatus === status;
}

function libraryResponse(query: Record<string, unknown>): LibraryListResponse {
  const needle = textParam(query.q).toLowerCase();
  const status = textParam(query.status);
  const searched = LIBRARY_GAMES.map(toLibraryEntry).filter((entry) =>
    entry.game.name.toLowerCase().includes(needle),
  );
  const filtered = searched
    .filter((entry) => matchesStatus(entry, status))
    .sort(compareEntries(textParam(query.sort)));
  return {
    ...paginate(filtered, query, LIBRARY_PAGE_SIZE),
    currency: DEMO_CURRENCY,
    facets: facetsFor(searched),
  };
}

function collectionDetail(id: string, query: Record<string, unknown>) {
  const def = COLLECTIONS.find((item) => item.id === id) ?? COLLECTIONS[0];
  const page = paginate(gamesFor(def), query, COLLECTION_PAGE_SIZE);
  return {
    id: def.id,
    name: def.name,
    type: def.type,
    ruleKey: def.ruleKey,
    description: def.description,
    color: def.color,
    total: page.total,
    page: page.page,
    pageSize: page.pageSize,
    games: page.items.map((game) => ({
      appId: game.appId,
      name: game.name,
      headerImage: steamHeaderUrl(game.appId),
      genres: [...game.genres],
    })),
  };
}

export const libraryRoutes: DemoRoute[] = [
  { method: "GET", pattern: "/library", respond: ({ query }) => libraryResponse(query) },
  {
    method: "GET",
    pattern: "/library/:id",
    respond: ({ params }) => toLibraryEntry(findOwnedGame(params.id)),
  },
  { method: "GET", pattern: "/collections", respond: () => collectionSummaries() },
  {
    method: "GET",
    pattern: "/collections/:id",
    respond: ({ params, query }) => collectionDetail(params.id, query),
  },
  {
    method: "GET",
    pattern: "/tags",
    respond: ({ query }) => {
      const game = findOwnedGame(textParam(query.mediaId));
      return {
        mediaType: textParam(query.mediaType) || "game",
        mediaId: textParam(query.mediaId) || String(game.appId),
        tags: game.genres.map((name, index) => ({
          id: `demo-tag-${game.appId}-${index}`,
          name,
          isUserModified: false,
          weight: 1,
        })),
      };
    },
  },
];
