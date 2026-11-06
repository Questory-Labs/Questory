import { DEMO_USER_ID, type TasteClusterPreview } from "@questorylabs/shared";
import type { DemoRequestContext } from "../demo.types";
import { daysAgo } from "./helpers";
import {
  asRecord,
  boundedInt,
  DEMO_ENGINE,
  DEMO_WORLD_SUMMARY,
  demoGame,
  demoGameId,
  demoGameKey,
  engineStatus,
  pickToItem,
  type DemoDomain,
  type DemoGameName,
  type DemoPick,
  type DemoRecommendationResponse,
} from "./enterprise-shared";

const HEURISTIC_PICKS: readonly DemoPick[] = [
  { name: "Cyberpunk 2077", score: 0.93, reason: "Owned, never started", blurb: "The biggest unopened story in your library." },
  { name: "It Takes Two", score: 0.9, reason: "Co-op backlog", blurb: "A two-player adventure you still have not tried." },
  { name: "Disco Elysium", score: 0.87, reason: "Matches your RPG streak", blurb: "A narrative RPG worth finishing." },
  { name: "Hollow Knight", score: 0.84, reason: "Unfinished adventure", blurb: "You stopped with plenty of the map still dark." },
  { name: "Elden Ring", score: 0.81, reason: "Played recently", blurb: "Your current character has momentum." },
  { name: "Slay the Spire", score: 0.78, reason: "Great for short sessions", blurb: "One more run fits almost any evening." },
  { name: "Deep Rock Galactic", score: 0.75, reason: "Popular with your friends", blurb: "Easy to jump into with a group." },
  { name: "Celeste", score: 0.72, reason: "Close to the end", blurb: "A focused platformer with a clear finish." },
  { name: "Valheim", score: 0.69, reason: "New biomes to explore", blurb: "A slow-burn survival world with friends." },
  { name: "Factorio", score: 0.66, reason: "A long-running favorite", blurb: "The factory could always grow a little more." },
  { name: "Portal 2", score: 0.63, reason: "Worth a replay", blurb: "A short, funny puzzle classic." },
  { name: "Hades", score: 0.6, reason: "Tight, repeatable runs", blurb: "A reliable pick when you have thirty minutes." },
];

const SEARCH_RESULTS: readonly {
  name: DemoGameName;
  year: number;
  score: number;
}[] = [
  { name: "Disco Elysium", year: 2019, score: 0.92 },
  { name: "Hollow Knight", year: 2017, score: 0.88 },
  { name: "Stardew Valley", year: 2016, score: 0.85 },
  { name: "Celeste", year: 2018, score: 0.83 },
  { name: "Hades", year: 2020, score: 0.79 },
  { name: "Baldur's Gate 3", year: 2023, score: 0.76 },
  { name: "Slay the Spire", year: 2019, score: 0.72 },
  { name: "Portal 2", year: 2011, score: 0.68 },
];

const HISTORY_SLATES: readonly {
  slateId: string;
  arm: string;
  source: string;
  ask: string;
  days: number;
  items: readonly {
    name: DemoGameName;
    why: string;
    feedback?: "like" | "dislike";
  }[];
}[] = [
  {
    slateId: "demo-slate-1",
    arm: "rerank",
    source: "curate",
    ask: "Short and calm",
    days: 2,
    items: [
      { name: "Stardew Valley", why: "An unhurried season with nothing to prove.", feedback: "like" },
      { name: "Celeste", why: "A short climb you can leave and come back to." },
    ],
  },
  {
    slateId: "demo-slate-2",
    arm: "rerank",
    source: "curate",
    ask: "Co-op with friends",
    days: 5,
    items: [
      { name: "Deep Rock Galactic", why: "Quick missions and an easy invite.", feedback: "like" },
      { name: "It Takes Two", why: "A two-player story you have yet to begin." },
      { name: "Factorio", why: "Strong co-op, but a very long commitment.", feedback: "dislike" },
    ],
  },
  {
    slateId: "demo-slate-3",
    arm: "rerank",
    source: "curate",
    ask: "Finish what I started",
    days: 9,
    items: [
      { name: "Hollow Knight", why: "You are closer to the ending than it feels." },
      { name: "Elden Ring", why: "One more region will finish this run." },
    ],
  },
];

const VALID_DOMAINS: readonly DemoDomain[] = ["games", "music", "watch", "read"];

function requestsOnlyOtherDomains(domains: unknown): boolean {
  if (!Array.isArray(domains)) return false;
  const known = domains.filter((domain) =>
    (VALID_DOMAINS as readonly unknown[]).includes(domain),
  );
  return known.length > 0 && !known.includes("games");
}

export function recommendations(ctx: DemoRequestContext) {
  const body = asRecord(ctx.body);
  const limit = boundedInt(body.limit, 12, 1, HEURISTIC_PICKS.length);
  const picks = requestsOnlyOtherDomains(body.domains)
    ? []
    : HEURISTIC_PICKS.slice(0, limit);
  const response: DemoRecommendationResponse = {
    available: true,
    engine: DEMO_ENGINE,
    userId: DEMO_USER_ID,
    generatedAt: new Date().toISOString(),
    ...engineStatus(),
    worldSummary: DEMO_WORLD_SUMMARY,
    items: picks.map(pickToItem),
    arm: "heuristic",
  };
  return response;
}

export function curateCache() {
  return { cached: false };
}

export function semanticSearch(ctx: DemoRequestContext) {
  const limit = boundedInt(asRecord(ctx.body).limit, 20, 1, 40);
  return {
    available: true,
    items: SEARCH_RESULTS.slice(0, limit).map(({ name, year, score }) => {
      const game = demoGame(name);
      return {
        key: demoGameKey(name),
        id: demoGameId(game),
        domain: "games" as const,
        kind: "game",
        name,
        imageUrl: pickToItem({ name, score, reason: "" }).imageUrl,
        year,
        score,
      };
    }),
  };
}

export function recommendationHistory(ctx: DemoRequestContext) {
  const limit = boundedInt(ctx.query.limit, 3, 1, 10);
  return {
    slates: HISTORY_SLATES.slice(0, limit).map((slate) => ({
      slateId: slate.slateId,
      arm: slate.arm,
      source: slate.source,
      ask: slate.ask,
      servedAt: Date.parse(daysAgo(slate.days)),
      items: slate.items.map((item, rank) => ({
        itemKey: demoGameKey(item.name),
        name: item.name,
        domain: "games",
        rank,
        why: item.why,
        owned: true,
        feedback: item.feedback ?? null,
      })),
    })),
    liked: ["Stardew Valley", "Deep Rock Galactic", "Disco Elysium"],
    passed: ["Factorio"],
  };
}

export function clustersPreview() {
  return {
    available: true,
    clusters: [
      { id: "demo-cluster-roguelike", name: "One more run", gameCount: 2, saved: true },
      { id: "demo-cluster-story", name: "Story-first RPGs", gameCount: 4, saved: false },
      { id: "demo-cluster-coop", name: "Better with friends", gameCount: 6, saved: false },
      { id: "demo-cluster-builders", name: "Build and tinker", gameCount: 3, saved: false },
    ],
  } satisfies TasteClusterPreview;
}
