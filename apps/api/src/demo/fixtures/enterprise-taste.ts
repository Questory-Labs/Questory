import type { WeeklyDigestView } from "@questorylabs/shared";
import { daysAgo } from "./helpers";
import {
  dayKey,
  isoWeekId,
  ONE_DAY_MS,
  weekStartMs,
} from "./enterprise-shared";

export function dossierView() {
  return {
    available: true,
    dossier: {
      identity:
        "A patient completionist who alternates long story RPGs with tight, replayable runs and the occasional night of co-op chaos.",
      gaming:
        "Baldur's Gate 3 and Stardew Valley anchor the library. Hades and Slay the Spire fill the short sessions, and Deep Rock Galactic is the usual group pick.",
      music:
        "Mostly instrumental listening: synth-heavy scores and ambient albums that stay out of the way during long play sessions.",
      watch:
        "Slow-burn science fiction and character-driven drama, usually one or two episodes at a time.",
      read: "Fantasy serials with big casts and long arcs, picked up in short bursts.",
      currentVibe:
        "Looking for something warm and contained after a long stretch of very large RPGs.",
      keywords: [
        "story-rich",
        "co-op nights",
        "roguelikes",
        "cozy sims",
        "automation",
        "long campaigns",
      ],
    },
    updatedAt: Date.parse(daysAgo(1)),
    refreshing: false,
  };
}

export function userSettings() {
  return {
    country: "United States",
    state: "Oregon",
    city: "Portland",
    countryCode: "US",
    latitude: 45.52,
    longitude: -122.68,
  };
}

export function weeklyDigest() {
  const now = Date.now();
  const monday = weekStartMs(now);
  return {
    cached: true,
    generating: false,
    result: {
      weekId: isoWeekId(now),
      from: dayKey(monday),
      to: dayKey(monday + 6 * ONE_DAY_MS),
      headline: "The charts are leaning into your kind of long weekend",
      body: "Big role-playing games and easy co-op are holding steady on the public charts this week. You already own most of what is climbing, so the best new discovery may be sitting unopened in your backlog.",
      items: [
        {
          domain: "games",
          name: "Cyberpunk 2077",
          reason: "Still high on the charts, and still unstarted in your library.",
          chartLabel: "Steam top sellers",
        },
        {
          domain: "games",
          name: "Baldur's Gate 3",
          reason: "Your most-played game continues to hold a large audience.",
          chartLabel: "Steam most played",
        },
        {
          domain: "games",
          name: "Deep Rock Galactic",
          reason: "A group favorite of yours that keeps drawing steady crowds.",
          chartLabel: "Steam most played",
        },
        {
          domain: "games",
          name: "Elden Ring",
          reason: "Its continued popularity lines up with your recent action RPG hours.",
          chartLabel: "Steam top sellers",
        },
      ],
      llmPolished: true,
    },
  } satisfies WeeklyDigestView;
}
