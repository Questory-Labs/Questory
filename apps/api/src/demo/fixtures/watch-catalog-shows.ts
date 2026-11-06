export type DemoShowRun = {
  startDaysAgo: number;
  cadenceDays: number;
  batch: number;
  count?: number;
};

export type DemoShow = {
  id: string;
  name: string;
  type: "show";
  year: number;
  overview: string;
  genres: string[];
  runtime: number;
  status: string;
  source: string;
  anime: boolean;
  seasons: number[];
  runs: DemoShowRun[];
  finalRating?: number;
  dropped?: boolean;
};

function show(
  slug: string,
  name: string,
  year: number,
  runtime: number,
  genres: string[],
  overview: string,
  seasons: number[],
  runs: DemoShowRun[],
  extra: Partial<Pick<DemoShow, "status" | "source" | "anime" | "finalRating" | "dropped">> = {},
): DemoShow {
  return {
    id: `demo-title-${slug}`,
    name,
    type: "show",
    year,
    overview,
    genres,
    runtime,
    seasons,
    runs,
    status: extra.status ?? "Ended",
    source: extra.source ?? "trakt",
    anime: extra.anime ?? false,
    ...(extra.finalRating != null ? { finalRating: extra.finalRating } : {}),
    ...(extra.dropped ? { dropped: true } : {}),
  };
}

export const DEMO_SHOWS: DemoShow[] = [
  show(
    "severance",
    "Severance",
    2022,
    50,
    ["Drama", "Mystery", "Science Fiction"],
    "Office workers undergo a procedure that splits their memories between work and home.",
    [9, 10],
    [
      { startDaysAgo: 700, cadenceDays: 2, batch: 1, count: 9 },
      { startDaysAgo: 90, cadenceDays: 7, batch: 1 },
    ],
    { status: "Returning Series", finalRating: 5 },
  ),
  show(
    "the-bear",
    "The Bear",
    2022,
    32,
    ["Drama", "Comedy"],
    "A fine-dining chef comes home to run his family's struggling Chicago sandwich shop.",
    [8, 10, 10],
    [
      { startDaysAgo: 560, cadenceDays: 1, batch: 3, count: 8 },
      { startDaysAgo: 200, cadenceDays: 2, batch: 2, count: 10 },
      { startDaysAgo: 34, cadenceDays: 3, batch: 1, count: 6 },
    ],
    { status: "Returning Series" },
  ),
  show(
    "andor",
    "Andor",
    2022,
    48,
    ["Science Fiction", "Drama", "Action"],
    "A thief becomes an unlikely spark in the early days of a galactic rebellion.",
    [12, 12],
    [
      { startDaysAgo: 420, cadenceDays: 3, batch: 2, count: 12 },
      { startDaysAgo: 28, cadenceDays: 3, batch: 1, count: 9 },
    ],
  ),
  show(
    "the-last-of-us",
    "The Last of Us",
    2023,
    55,
    ["Drama", "Science Fiction", "Action"],
    "A hardened survivor escorts a teenage girl across a collapsed America.",
    [9, 7],
    [
      { startDaysAgo: 1000, cadenceDays: 7, batch: 1, count: 9 },
      { startDaysAgo: 150, cadenceDays: 7, batch: 1 },
    ],
    { status: "Returning Series", finalRating: 4 },
  ),
  show(
    "succession",
    "Succession",
    2018,
    60,
    ["Drama"],
    "The children of a media titan scheme for control of the family empire.",
    [9, 10, 9, 10],
    [{ startDaysAgo: 640, cadenceDays: 3, batch: 2 }],
    { finalRating: 5 },
  ),
  show(
    "shogun",
    "Shogun",
    2024,
    60,
    ["Drama", "Adventure", "History"],
    "A shipwrecked English navigator is drawn into a power struggle in feudal Japan.",
    [10],
    [{ startDaysAgo: 240, cadenceDays: 7, batch: 1 }],
    { finalRating: 4.5 },
  ),
  show(
    "better-call-saul",
    "Better Call Saul",
    2015,
    47,
    ["Drama", "Crime"],
    "A small-time lawyer slowly becomes the criminal attorney Saul Goodman.",
    [10, 10, 10, 10, 10, 13],
    [{ startDaysAgo: 330, cadenceDays: 2, batch: 2, count: 40 }],
  ),
  show(
    "breaking-bad",
    "Breaking Bad",
    2008,
    47,
    ["Drama", "Crime"],
    "A chemistry teacher with a terminal diagnosis turns to making methamphetamine.",
    [7, 13, 13, 13, 16],
    [{ startDaysAgo: 880, cadenceDays: 3, batch: 2 }],
    { finalRating: 5 },
  ),
  show(
    "dark",
    "Dark",
    2017,
    55,
    ["Science Fiction", "Mystery", "Drama"],
    "A missing child exposes the secrets of four families in a small German town.",
    [10, 8, 8],
    [{ startDaysAgo: 130, cadenceDays: 2, batch: 2 }],
    { finalRating: 4.5 },
  ),
  show(
    "slow-horses",
    "Slow Horses",
    2022,
    45,
    ["Drama", "Thriller", "Comedy"],
    "Disgraced British intelligence agents are exiled to a dead-end department.",
    [6, 6, 6, 6],
    [{ startDaysAgo: 60, cadenceDays: 3, batch: 1, count: 18 }],
    { status: "Returning Series" },
  ),
  show(
    "frieren",
    "Frieren: Beyond Journey's End",
    2023,
    24,
    ["Animation", "Fantasy", "Adventure"],
    "An elven mage retraces her old party's journey long after their quest has ended.",
    [28],
    [{ startDaysAgo: 470, cadenceDays: 1, batch: 2 }],
    { status: "Returning Series", source: "anilist", anime: true, finalRating: 5 },
  ),
  show(
    "jujutsu-kaisen",
    "Jujutsu Kaisen",
    2020,
    24,
    ["Animation", "Action", "Fantasy"],
    "A student swallows a cursed relic and joins a school of sorcerers.",
    [24, 23],
    [{ startDaysAgo: 70, cadenceDays: 2, batch: 2, count: 30 }],
    { status: "Returning Series", source: "anilist", anime: true },
  ),
  show(
    "spy-x-family",
    "Spy x Family",
    2022,
    24,
    ["Animation", "Comedy", "Action"],
    "A spy, an assassin, and a telepath form a fake family for a secret mission.",
    [25, 12, 13],
    [{ startDaysAgo: 24, cadenceDays: 2, batch: 1, count: 11 }],
    { status: "Returning Series", source: "anilist", anime: true },
  ),
  show(
    "fma-brotherhood",
    "Fullmetal Alchemist: Brotherhood",
    2009,
    24,
    ["Animation", "Adventure", "Fantasy"],
    "Two brothers search for a legendary stone to restore their bodies after a failed ritual.",
    [64],
    [{ startDaysAgo: 780, cadenceDays: 1, batch: 3 }],
    { source: "anilist", anime: true, finalRating: 5 },
  ),
  show(
    "cowboy-bebop",
    "Cowboy Bebop",
    1998,
    24,
    ["Animation", "Science Fiction", "Action"],
    "A crew of bounty hunters drifts through the solar system, chased by their pasts.",
    [26],
    [{ startDaysAgo: 520, cadenceDays: 2, batch: 2 }],
    { source: "anilist", anime: true, finalRating: 4.5 },
  ),
  show(
    "attack-on-titan",
    "Attack on Titan",
    2013,
    24,
    ["Animation", "Action", "Drama"],
    "Humanity fights for survival against giants from behind enormous walls.",
    [25, 12, 22, 30],
    [{ startDaysAgo: 300, cadenceDays: 2, batch: 2, count: 60 }],
    { source: "anilist", anime: true, dropped: true },
  ),
  show(
    "friends",
    "Friends",
    1994,
    22,
    ["Comedy"],
    "Six friends navigate work, love, and coffee in New York City.",
    [24, 24, 25, 24, 24, 25, 24, 24, 24, 18],
    [
      { startDaysAgo: 1080, cadenceDays: 4, batch: 2, count: 100 },
      { startDaysAgo: 13, cadenceDays: 1, batch: 1, count: 14 },
    ],
    { source: "plex" },
  ),
];

export const DEMO_EPISODE_NAMES: Record<string, Record<string, string>> = {
  "demo-title-severance": {
    "1:1": "Good News About Hell",
    "1:2": "Half Loop",
    "1:3": "In Perpetuity",
    "1:4": "The You You Are",
    "1:5": "The Grim Barbarity of Optics and Design",
    "1:6": "Hide and Seek",
    "1:7": "Defiant Jazz",
    "1:8": "What's for Dinner?",
    "1:9": "The We We Are",
  },
  "demo-title-breaking-bad": {
    "1:1": "Pilot",
    "1:2": "Cat's in the Bag...",
    "1:3": "...And the Bag's in the River",
    "1:4": "Cancer Man",
    "1:5": "Gray Matter",
    "1:6": "Crazy Handful of Nothin'",
    "1:7": "A No-Rough-Stuff-Type Deal",
  },
};
