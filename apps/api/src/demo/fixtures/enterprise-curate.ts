import { DEMO_CURATE_QUESTIONS, DEMO_USER_ID } from "@questorylabs/shared";
import {
  asRecord,
  DEMO_ENGINE,
  DEMO_WORLD_SUMMARY,
  engineStatus,
  pickToItem,
  type DemoPick,
  type DemoRecommendationResponse,
} from "./enterprise-shared";

type CurateSlate = {
  moodSummary: string;
  plan: NonNullable<DemoRecommendationResponse["plan"]>;
  picks: DemoPick[];
};

const SOCIAL = "social";

export const CURATE_SLATES: readonly CurateSlate[] = [
  {
    moodSummary: "Warm, low-stakes, and done by Sunday night.",
    plan: {
      title: "A gentle weekend, start to finish",
      steps: [
        { itemIndex: 0, note: "Saturday: climb at your own pace" },
        { itemIndex: 1, note: "Sunday: a clever, funny finish" },
        { itemIndex: 3, note: "Sunday night: one quiet in-game season" },
      ],
    },
    picks: [
      {
        name: "Celeste",
        score: 0.94,
        reason: "Finishable in a weekend",
        why: "The main climb runs about eight hours, and Assist Mode lets you soften any screen that stops feeling cozy.",
        blurb: "A tender mountain story with a clear ending.",
      },
      {
        name: "Portal 2",
        score: 0.9,
        reason: "Short single-player campaign",
        why: "The solo campaign fits two relaxed sittings, and the puzzles reward patience over reflexes.",
        blurb: "Dry humor and gentle puzzle-solving from start to credits.",
      },
      {
        name: "Overcooked! 2",
        score: 0.82,
        reason: "Bite-size levels",
        why: "Levels last a few minutes, so you can clear the story in short, cheerful bursts between other plans.",
        blurb: "Bright kitchens, short rounds, no long commitment.",
      },
      {
        name: "Stardew Valley",
        score: 0.78,
        reason: "Your coziest favorite",
        why: "It never truly ends, but one in-game season is a tidy weekend goal and the calmest place in your library.",
        blurb: "Set a single-season goal and call it finished.",
      },
      {
        name: "Slay the Spire",
        score: 0.68,
        reason: "One run, one sitting",
        why: "A single run takes about an hour, which makes it an easy coda when you have an evening left over.",
        blurb: "Thoughtful, turn-based, and played entirely at your pace.",
      },
    ],
  },
  {
    moodSummary: "Three players, one night, and no long setup.",
    plan: {
      title: "Three players, one good night",
      steps: [
        { itemIndex: 3, note: "Warm up with a few chaotic kitchens" },
        { itemIndex: 0, note: "Main event: a couple of deep missions" },
        { itemIndex: 1, note: "Wind down by building a base together" },
      ],
    },
    picks: [
      {
        name: "Deep Rock Galactic",
        score: 0.96,
        reason: "Built for up to four players",
        why: "Missions drop you straight into teamwork, and three players cover every job without any lengthy setup.",
        blurb: "Short class-based missions with an easy drop-in rhythm.",
        cardType: SOCIAL,
      },
      {
        name: "Valheim",
        score: 0.89,
        reason: "Easy to host for three",
        why: "A shared world suits three people well: one explores, one builds, and one is always cooking.",
        blurb: "Survive, build, and sail at whatever pace the group likes.",
        cardType: SOCIAL,
      },
      {
        name: "Terraria",
        score: 0.84,
        reason: "Long-lived shared worlds",
        why: "Dig into a new world tonight, and the same world will still be waiting the next time all three of you are free.",
        blurb: "Endless digging, crafting, and boss fights together.",
        cardType: SOCIAL,
      },
      {
        name: "Overcooked! 2",
        score: 0.8,
        reason: "Instantly easy to explain",
        why: "Nobody needs a tutorial, and a third cook adds exactly the right amount of kitchen panic.",
        blurb: "Short rounds that make a perfect warm-up.",
        cardType: SOCIAL,
      },
      {
        name: "Baldur's Gate 3",
        score: 0.73,
        reason: "Full party campaign",
        why: "If the group wants a story to return to, a three-person party works well, though a campaign outlasts one night.",
        blurb: "Deep co-op role-playing for a group ready to commit.",
        cardType: SOCIAL,
      },
    ],
  },
  {
    moodSummary: "A long, rainy evening deserves a story with weight.",
    plan: {
      title: "Lose the whole evening to a story",
      steps: [
        { itemIndex: 0, note: "Settle in with the case you never closed" },
        { itemIndex: 1, note: "If you want something new, start here" },
        { itemIndex: 2, note: "Or return to the party waiting at camp" },
      ],
    },
    picks: [
      {
        name: "Disco Elysium",
        score: 0.97,
        reason: "Rich, dialogue-led story",
        why: "It is almost all words, atmosphere, and rain-soaked melancholy, so it matches a slow evening better than anything else you own.",
        blurb: "A detective story told through a fractured inner monologue.",
      },
      {
        name: "Cyberpunk 2077",
        score: 0.91,
        reason: "Waiting in your backlog",
        why: "You own it and have never started it, and its neon, rain-slick city makes a strong first impression on a long night.",
        blurb: "A dense open-world story with sharply written side quests.",
      },
      {
        name: "Baldur's Gate 3",
        score: 0.87,
        reason: "Your most-played RPG",
        why: "You already love this world, and one long evening is enough to see a whole companion arc through.",
        blurb: "Choices, companions, and consequences at enormous scale.",
      },
      {
        name: "Hollow Knight",
        score: 0.75,
        reason: "Story found through exploring",
        why: "Its sorrowful story arrives in fragments, which suits an evening of quiet wandering with the rain outside.",
        blurb: "A haunting, wordless descent through a ruined kingdom.",
      },
      {
        name: "Elden Ring",
        score: 0.7,
        reason: "Lore worth piecing together",
        why: "Pick a region you skipped and follow its questline slowly; the story rewards players who take their time.",
        blurb: "Myth told through places, items, and strange encounters.",
      },
    ],
  },
];

export function curateIndexForBody(body: unknown): number {
  const mood = asRecord(asRecord(body).context).mood;
  if (typeof mood !== "string") return 0;
  const index = (DEMO_CURATE_QUESTIONS as readonly string[]).indexOf(mood);
  return index >= 0 ? index : 0;
}

export function curateIndexForJobId(id: string): number {
  const index = CURATE_SLATES.findIndex((_, i) => id === `demo-${i}`);
  return index >= 0 ? index : 0;
}

export function curateJob(index: number) {
  const slate = CURATE_SLATES[index];
  const result: DemoRecommendationResponse = {
    available: true,
    engine: DEMO_ENGINE,
    userId: DEMO_USER_ID,
    generatedAt: new Date().toISOString(),
    ...engineStatus(),
    moodSummary: slate.moodSummary,
    plan: slate.plan,
    worldSummary: DEMO_WORLD_SUMMARY,
    items: slate.picks.map(pickToItem),
    arm: "rerank",
  };
  return {
    jobId: `demo-${index}`,
    status: "done" as const,
    events: [],
    result,
  };
}
