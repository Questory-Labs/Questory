import type { AiGoalsResponse } from "@questorylabs/shared";
import type { DemoRequestContext } from "../demo.types";
import {
  asRecord,
  boundedInt,
  demoGameKey,
  isoWeekId,
  ONE_DAY_MS,
  type DemoGameName,
} from "./enterprise-shared";

const SUGGESTIONS: readonly {
  name: DemoGameName;
  minutes: number;
  reason: string;
}[] = [
  { name: "Hades", minutes: 240, reason: "Short runs fit any evening, and a few more escapes could reach the true ending." },
  { name: "Portal 2", minutes: 480, reason: "A short campaign that fits comfortably in a week of evenings." },
  { name: "Elden Ring", minutes: 900, reason: "Your current run has momentum, so this is a good week for the next region." },
  { name: "Stardew Valley", minutes: 360, reason: "One more in-game season is a calm, achievable goal." },
  { name: "Deep Rock Galactic", minutes: 180, reason: "A few missions make an easy group plan this week." },
  { name: "Valheim", minutes: 300, reason: "Pick one biome and finish it with your friends." },
  { name: "Overcooked! 2", minutes: 120, reason: "Short rounds that wrap up quickly." },
  { name: "Terraria", minutes: 420, reason: "A good week to take down the next boss." },
  { name: "Baldur's Gate 3", minutes: 720, reason: "See one companion quest through to its end." },
  { name: "Factorio", minutes: 600, reason: "Set a single milestone and keep the factory from swallowing the week." },
];

const AI_GOALS: readonly {
  name: DemoGameName;
  minutes: number;
  reason: string;
}[] = [
  { name: "Disco Elysium", minutes: 240, reason: "Story RPGs fill your recent hours, and this one still has threads left to close." },
  { name: "It Takes Two", minutes: 180, reason: "You keep choosing co-op, and this adventure is waiting for a partner." },
  { name: "Slay the Spire", minutes: 120, reason: "Your short sessions suit a push for one more ascension win." },
];

export function smartGoals(ctx: DemoRequestContext) {
  const targetCount = boundedInt(
    asRecord(ctx.body).targetCount,
    5,
    1,
    SUGGESTIONS.length,
  );
  return {
    generatedAt: new Date().toISOString(),
    timeframe: "this week",
    targetCount,
    suggestions: SUGGESTIONS.slice(0, targetCount).map((suggestion) => ({
      itemKey: demoGameKey(suggestion.name),
      name: suggestion.name,
      domain: "games" as const,
      kind: "game" as const,
      estimatedTimeMinutes: suggestion.minutes,
      reason: suggestion.reason,
    })),
  };
}

export function aiGoals() {
  const now = Date.now();
  const tomorrow = new Date(now + ONE_DAY_MS);
  return {
    status: "ready",
    period: isoWeekId(now),
    goals: AI_GOALS.map((goal) => ({
      itemKey: demoGameKey(goal.name),
      name: goal.name,
      domain: "games" as const,
      kind: "game",
      estimatedTimeMinutes: goal.minutes,
      reason: goal.reason,
      specific: true,
    })),
    rerollsLeft: 2,
    rerollsPerDay: 2,
    rerollsResetAt: new Date(
      Date.UTC(
        tomorrow.getUTCFullYear(),
        tomorrow.getUTCMonth(),
        tomorrow.getUTCDate(),
      ),
    ).toISOString(),
  } satisfies AiGoalsResponse;
}
