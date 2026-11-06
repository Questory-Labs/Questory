import {
  MultiplayerPlanRequestSchema,
  type MultiplayerPlanGame,
  type MultiplayerPlanRequest,
  type MultiplayerPlanResponse,
} from "@questorylabs/shared";
import { playerFilterMatches } from "../../lib/player-counts";
import { DEMO_FRIENDS, steamHeaderUrl } from "./helpers";
import {
  FRIEND_LIBRARIES,
  SOCIAL_GAMES,
  VIEWER_CURRENCY,
  viewerOwns,
  type SocialGame,
} from "./social-data";

const MODE_MATCHERS: Record<string, RegExp> = {
  local_coop: /local co-op|shared\/split|local multi/i,
  online_coop: /online co-op|co-op/i,
  pvp: /pvp|versus|competitive/i,
  crossplay: /cross.?play/i,
};

type PlanRow = MultiplayerPlanGame & { togetherMinutes: number; concurrent: number };

function parseRequest(body: unknown): MultiplayerPlanRequest {
  const parsed = MultiplayerPlanRequestSchema.safeParse(body ?? {});
  return parsed.success ? parsed.data : MultiplayerPlanRequestSchema.parse({});
}

function displayGenres(game: SocialGame): string[] {
  return [...new Set([...game.genres, ...game.steamGenres])];
}

function matchesFilters(
  game: SocialGame,
  input: MultiplayerPlanRequest,
  bounds: { minPlayers: number; maxPlayers: number; minYear: number; maxYear: number },
): boolean {
  const players = game.players;
  if (!players) return false;
  if (input.mode) {
    const cats = [...game.categories, ...game.tags].join(" ");
    if (!MODE_MATCHERS[input.mode].test(cats)) return false;
  }
  if (input.genre) {
    const want = input.genre.toLowerCase();
    if (!displayGenres(game).some((genre) => genre.toLowerCase() === want)) {
      return false;
    }
  }
  if (
    !playerFilterMatches(
      players.min,
      players.max,
      bounds.minPlayers,
      bounds.maxPlayers,
      players.maxes,
    )
  ) {
    return false;
  }
  const year = Number(game.releaseDate.slice(0, 4));
  return year >= bounds.minYear && year <= bounds.maxYear;
}

function planRow(
  game: SocialGame,
  party: readonly (typeof DEMO_FRIENDS)[number][],
): PlanRow {
  const ownedByYou = viewerOwns(game.appId);
  const owners = party.filter((friend) =>
    FRIEND_LIBRARIES.get(friend.steamId)?.has(game.appId),
  );
  const missing = party.filter((friend) => !owners.includes(friend));
  const ownership =
    ownedByYou && missing.length === 0
      ? "shared"
      : ownedByYou || owners.length > 0
        ? "partial"
        : "unowned";
  const friendMinutes = party.reduce(
    (sum, friend) =>
      sum + (FRIEND_LIBRARIES.get(friend.steamId)?.get(game.appId) ?? 0),
    0,
  );
  const players = game.players;
  return {
    appId: game.appId,
    name: game.name,
    headerImage: steamHeaderUrl(game.appId),
    genres: displayGenres(game),
    categories: game.categories,
    deckStatus: game.deckStatus,
    yourPlaytimeMinutes: ownedByYou ? game.minutes : undefined,
    releaseYear: Number(game.releaseDate.slice(0, 4)),
    reviewScore: game.reviewScore,
    minPlayers: players?.min ?? null,
    maxPlayers: players?.max ?? null,
    playerMaxes: players?.maxes ?? null,
    playerCountSource: players?.source ?? null,
    isSuggested: !ownedByYou,
    ownedByYou,
    ownedByFriends: owners.map((friend) => friend.personaName),
    missingFriends: missing.map((friend) => friend.personaName),
    ownership,
    currentPrice: game.currentPrice,
    currency: VIEWER_CURRENCY,
    togetherMinutes: (ownedByYou ? game.minutes : 0) + friendMinutes,
    concurrent: game.online.current,
  };
}

function compareRows(sortBy: MultiplayerPlanRequest["sortBy"]) {
  return (a: PlanRow, b: PlanRow): number => {
    const suggested = Number(a.isSuggested) - Number(b.isSuggested);
    const review = (b.reviewScore ?? 0) - (a.reviewScore ?? 0);
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name) || suggested;
      case "playedTogether":
        return b.togetherMinutes - a.togetherMinutes || review || suggested;
      case "release":
        return (b.releaseYear ?? 0) - (a.releaseYear ?? 0) || suggested;
      case "review":
        return review || suggested;
      case "trending":
        return b.concurrent - a.concurrent || suggested;
      default:
        return (
          (b.yourPlaytimeMinutes ?? 0) - (a.yourPlaytimeMinutes ?? 0) ||
          review ||
          suggested
        );
    }
  };
}

export function multiplayerPlan(body: unknown): MultiplayerPlanResponse {
  const input = parseRequest(body);
  const requested = new Set(input.friendSteamIds);
  const party = DEMO_FRIENDS.filter((friend) => requested.has(friend.steamId));
  const bounds = {
    minPlayers: Math.min(input.minPlayers, input.maxPlayers),
    maxPlayers: Math.max(input.minPlayers, input.maxPlayers),
    minYear: Math.min(input.minYear, input.maxYear),
    maxYear: Math.max(input.minYear, input.maxYear),
  };
  const rows = SOCIAL_GAMES.filter((game) => matchesFilters(game, input, bounds))
    .map((game) => planRow(game, party))
    .filter((row) => (row.isSuggested ? input.suggested : true))
    .filter((row) =>
      input.strictLibraryMatching && !row.isSuggested
        ? row.ownership === "shared"
        : true,
    )
    .sort(compareRows(input.sortBy));

  return {
    ...bounds,
    sortBy: input.sortBy,
    friendCount: party.length,
    games: rows.map(({ togetherMinutes: _m, concurrent: _c, ...game }) => game),
  } satisfies MultiplayerPlanResponse;
}
