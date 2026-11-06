import { DEMO_GAMES, steamHeaderUrl } from "./helpers";

const DAY_MS = 24 * 60 * 60 * 1000;

export type DemoGame = (typeof DEMO_GAMES)[number];
export type DemoGameName = DemoGame["name"];

export type DemoDomain = "games" | "music" | "watch" | "read";

export type DemoRecommendationItem = {
  kind: "game";
  domain: "games";
  gameId: string;
  appId: number;
  name: string;
  imageUrl: string;
  score: number;
  reasons: string[];
  blurb?: string;
  why?: string;
  itemKey: string;
  cardType?: string;
};

export type DemoRecommendationResponse = {
  available: boolean;
  engine: string;
  userId: string;
  generatedAt: string;
  ml: { enabled: boolean; ready: boolean; model?: string };
  llm: {
    enabled: boolean;
    ready: boolean;
    model?: string;
    tiers?: {
      tier: "reason" | "write" | "fast";
      model: string;
      reasoning: string;
    }[];
    embedModel?: string;
  };
  moodSummary?: string;
  plan?: { title: string; steps: { itemIndex?: number; note: string }[] };
  worldSummary?: string;
  items: DemoRecommendationItem[];
  arm: "heuristic" | "rerank";
};

export const DEMO_ENGINE = "qengine/demo";

export const DEMO_MODELS = {
  reason: "demo/curator-large",
  write: "demo/writer-medium",
  fast: "demo/fast-small",
  embed: "demo/embed-small",
} as const;

export const DEMO_WORLD_SUMMARY =
  "Rain through the evening in Portland, and nothing on the calendar.";

export function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function boundedInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed =
    typeof value === "string" && /^\d{1,9}$/.test(value) ? Number(value) : value;
  if (typeof parsed !== "number" || !Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

const GAMES_BY_NAME = new Map<string, DemoGame>(
  DEMO_GAMES.map((game) => [game.name, game]),
);

export function demoGame(name: DemoGameName): DemoGame {
  return GAMES_BY_NAME.get(name) as DemoGame;
}

export function demoGameId(game: DemoGame): string {
  return `demo-game-${game.appId}`;
}

export function demoGameKey(name: DemoGameName): string {
  return `game:${demoGameId(demoGame(name))}`;
}

export function playtimeLabel(name: DemoGameName): string {
  const { minutes } = demoGame(name);
  return minutes > 0 ? `${Math.round(minutes / 60)}h played` : "Unplayed";
}

export type DemoPick = {
  name: DemoGameName;
  score: number;
  reason: string;
  blurb?: string;
  why?: string;
  cardType?: string;
};

export function pickToItem(pick: DemoPick): DemoRecommendationItem {
  const game = demoGame(pick.name);
  return {
    kind: "game",
    domain: "games",
    gameId: demoGameId(game),
    appId: game.appId,
    name: game.name,
    imageUrl: steamHeaderUrl(game.appId),
    score: pick.score,
    reasons: [playtimeLabel(pick.name), pick.reason],
    ...(pick.blurb ? { blurb: pick.blurb } : {}),
    ...(pick.why ? { why: pick.why } : {}),
    itemKey: demoGameKey(pick.name),
    ...(pick.cardType ? { cardType: pick.cardType } : {}),
  };
}

export function engineStatus(): Pick<
  DemoRecommendationResponse,
  "ml" | "llm"
> {
  return {
    ml: { enabled: true, ready: true, model: DEMO_MODELS.embed },
    llm: {
      enabled: true,
      ready: true,
      model: DEMO_MODELS.reason,
      tiers: [
        { tier: "reason", model: DEMO_MODELS.reason, reasoning: "medium" },
        { tier: "write", model: DEMO_MODELS.write, reasoning: "off" },
        { tier: "fast", model: DEMO_MODELS.fast, reasoning: "off" },
      ],
      embedModel: DEMO_MODELS.embed,
    },
  };
}

export function weekStartMs(now: number, weeksBack = 0): number {
  const date = new Date(now);
  const sinceMonday = (date.getUTCDay() + 6) % 7;
  return (
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
    (sinceMonday + weeksBack * 7) * DAY_MS
  );
}

export function isoWeekId(now: number): string {
  const thursday = new Date(weekStartMs(now) + 3 * DAY_MS);
  const year = thursday.getUTCFullYear();
  const week = Math.ceil((thursday.getTime() - Date.UTC(year, 0, 1)) / (7 * DAY_MS) + 1 / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export const ONE_DAY_MS = DAY_MS;
