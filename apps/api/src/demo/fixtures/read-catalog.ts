import type { ReadLibraryPage } from "@questorylabs/shared";

type LibraryItem = ReadLibraryPage["items"][number];

export type DemoReadSession = {
  startDaysAgo: number;
  cadenceDays: number;
  sessions: number;
  chapters: number;
};

export type DemoReadTitle = {
  id: string;
  name: string;
  format: LibraryItem["title"]["format"];
  category: LibraryItem["title"]["category"];
  year: number;
  overview: string;
  genres: string[];
  publishingStatus: string;
  chapters: number | null;
  volumes: number | null;
  chaptersPerVolume: number;
  listStatus: LibraryItem["listStatus"];
  score: number | null;
  source: string;
  listedDaysAgo: number;
  runs: DemoReadSession[];
};

type Numbers = {
  year: number;
  chapters: number | null;
  volumes: number | null;
  score: number | null;
  listedDaysAgo: number;
};

function title(
  slug: string,
  name: string,
  format: DemoReadTitle["format"],
  category: DemoReadTitle["category"],
  listStatus: DemoReadTitle["listStatus"],
  publishingStatus: string,
  genres: string[],
  overview: string,
  numbers: Numbers,
  runs: DemoReadSession[] = [],
  source = "anilist",
): DemoReadTitle {
  return {
    id: `demo-read-${slug}`,
    name,
    format,
    category,
    listStatus,
    publishingStatus,
    genres,
    overview,
    source,
    runs,
    year: numbers.year,
    chapters: numbers.chapters,
    volumes: numbers.volumes,
    chaptersPerVolume:
      numbers.chapters && numbers.volumes
        ? Math.max(1, Math.round(numbers.chapters / numbers.volumes))
        : 9,
    score: numbers.score,
    listedDaysAgo: numbers.listedDaysAgo,
  };
}

const run = (
  startDaysAgo: number,
  cadenceDays: number,
  sessions: number,
  chapters: number,
): DemoReadSession => ({ startDaysAgo, cadenceDays, sessions, chapters });

export const DEMO_READ_TITLES: DemoReadTitle[] = [
  title("berserk", "Berserk", "manga", "manga", "reading", "RELEASING", ["Action", "Fantasy", "Horror"], "A lone mercenary with a giant sword battles demons and his own past.", { year: 1989, chapters: null, volumes: null, score: 10, listedDaysAgo: 700 }, [run(700, 5, 60, 5), run(18, 3, 7, 2)]),
  title("vagabond", "Vagabond", "manga", "manga", "paused", "HIATUS", ["Action", "Drama", "Historical"], "A fictionalized account of the swordsman Miyamoto Musashi's path to enlightenment.", { year: 1998, chapters: 327, volumes: 37, score: 9, listedDaysAgo: 420 }, [run(420, 4, 40, 5)]),
  title("one-piece", "One Piece", "manga", "manga", "reading", "RELEASING", ["Adventure", "Action", "Comedy"], "A rubber-bodied pirate sets out to find the greatest treasure in the world.", { year: 1997, chapters: null, volumes: null, score: 9, listedDaysAgo: 1000 }, [run(1000, 7, 130, 8), run(40, 1, 41, 2)]),
  title("monster", "Monster", "manga", "manga", "completed", "FINISHED", ["Mystery", "Thriller", "Drama"], "A surgeon hunts the former patient he once saved, now a charming killer.", { year: 1994, chapters: 162, volumes: 18, score: 10, listedDaysAgo: 610 }, [run(610, 2, 27, 6)]),
  title("vinland-saga", "Vinland Saga", "manga", "manga", "reading", "RELEASING", ["Action", "Adventure", "Historical"], "A young Viking seeks revenge, and later something far harder to find.", { year: 2005, chapters: null, volumes: null, score: 9, listedDaysAgo: 310 }, [run(310, 3, 60, 3)]),
  title("chainsaw-man", "Chainsaw Man", "manga", "manga", "reading", "RELEASING", ["Action", "Horror", "Comedy"], "A debt-ridden teen merges with his devil dog and joins a state-run hunting squad.", { year: 2018, chapters: null, volumes: null, score: 8, listedDaysAgo: 150 }, [run(150, 2, 50, 3)]),
  title("frieren", "Frieren: Beyond Journey's End", "manga", "manga", "reading", "RELEASING", ["Fantasy", "Adventure", "Drama"], "An elven mage learns what her companions meant to her, long after they are gone.", { year: 2020, chapters: null, volumes: null, score: 10, listedDaysAgo: 96 }, [run(96, 2, 40, 2)]),
  title("dorohedoro", "Dorohedoro", "manga", "manga", "completed", "FINISHED", ["Action", "Fantasy", "Comedy"], "A man with a lizard head searches for the sorcerer who cursed him.", { year: 2000, chapters: 167, volumes: 23, score: 8, listedDaysAgo: 860 }, [run(860, 2, 28, 6)]),
  title("goodnight-punpun", "Goodnight Punpun", "manga", "manga", "completed", "FINISHED", ["Drama", "Psychological", "Slice of Life"], "A boy drawn as a little bird grows up through love, loss, and despair.", { year: 2007, chapters: 147, volumes: 13, score: 9, listedDaysAgo: 540 }, [run(540, 3, 21, 7)]),
  title("witch-hat-atelier", "Witch Hat Atelier", "manga", "manga", "reading", "RELEASING", ["Fantasy", "Adventure"], "A girl learns the secret that anyone can draw magic, and becomes a witch's apprentice.", { year: 2016, chapters: null, volumes: null, score: 9, listedDaysAgo: 75 }, [run(75, 5, 15, 3)]),
  title("blue-period", "Blue Period", "manga", "manga", "dropped", "RELEASING", ["Drama", "Slice of Life"], "A high schooler discovers painting and gambles his future on art school.", { year: 2017, chapters: null, volumes: null, score: 6, listedDaysAgo: 260 }, [run(260, 6, 8, 3)]),
  title("nana", "Nana", "manga", "manga", "planning", "HIATUS", ["Drama", "Romance", "Music"], "Two young women who share a name and an apartment chase very different dreams.", { year: 2000, chapters: 84, volumes: 21, score: null, listedDaysAgo: 22 }),
  title("solo-leveling", "Solo Leveling", "manhwa", "manga", "completed", "FINISHED", ["Action", "Fantasy"], "The weakest hunter alive gains the power to level up without limit.", { year: 2018, chapters: 179, volumes: 14, score: 8, listedDaysAgo: 480 }, [run(480, 1, 30, 6)]),
  title("tower-of-god", "Tower of God", "manhwa", "manga", "reading", "RELEASING", ["Fantasy", "Action", "Mystery"], "A boy enters a deadly tower to find the girl who was his whole world.", { year: 2010, chapters: null, volumes: null, score: 8, listedDaysAgo: 220 }, [run(220, 4, 55, 4)]),
  title("omniscient-reader", "Omniscient Reader's Viewpoint", "manhwa", "manga", "reading", "RELEASING", ["Action", "Fantasy"], "The sole reader of a web novel finds its apocalypse coming true.", { year: 2020, chapters: null, volumes: null, score: 9, listedDaysAgo: 64 }, [run(64, 1, 65, 1)]),
  title("beginning-after-the-end", "The Beginning After the End", "manhwa", "manga", "repeating", "RELEASING", ["Fantasy", "Adventure"], "A king reincarnates into a world of magic, determined to do better.", { year: 2018, chapters: null, volumes: null, score: 7, listedDaysAgo: 330 }, [run(330, 3, 30, 4)]),
  title("lookism", "Lookism", "manhwa", "manga", "paused", "RELEASING", ["Drama", "Action", "Comedy"], "A bullied teenager wakes up in a second, impossibly handsome body.", { year: 2014, chapters: null, volumes: null, score: 6, listedDaysAgo: 760 }, [run(760, 5, 12, 5)]),
  title("tales-of-demons-and-gods", "Tales of Demons and Gods", "manhua", "manga", "dropped", "RELEASING", ["Action", "Fantasy"], "A cultivator returns to his youth with memories of the catastrophe to come.", { year: 2015, chapters: null, volumes: null, score: 5, listedDaysAgo: 680 }, [run(680, 4, 10, 6)]),
  title("mo-dao-zu-shi", "Mo Dao Zu Shi", "manhua", "manga", "completed", "FINISHED", ["Fantasy", "Mystery", "Historical"], "A disgraced cultivator is resurrected and unravels an old conspiracy.", { year: 2017, chapters: 240, volumes: 11, score: 8, listedDaysAgo: 950 }, [run(950, 2, 40, 6)]),
  title("spice-and-wolf", "Spice and Wolf", "novel", "novel", "reading", "RELEASING", ["Fantasy", "Romance", "Adventure"], "A traveling merchant strikes up a partnership with a wolf harvest deity.", { year: 2006, chapters: null, volumes: 24, score: 8, listedDaysAgo: 180 }, [run(180, 12, 15, 2)]),
  title("apothecary-diaries", "The Apothecary Diaries", "novel", "novel", "reading", "RELEASING", ["Mystery", "Drama", "Historical"], "A sharp-witted apothecary solves medical mysteries in an imperial palace.", { year: 2014, chapters: null, volumes: 15, score: 9, listedDaysAgo: 120 }, [run(120, 7, 17, 3)]),
  title("mushoku-tensei", "Mushoku Tensei", "novel", "novel", "planning", "FINISHED", ["Fantasy", "Adventure"], "A shut-in reincarnates in a magical world and vows to live without regrets.", { year: 2014, chapters: null, volumes: 26, score: null, listedDaysAgo: 36 }),
  title("overlord", "Overlord", "novel", "novel", "paused", "RELEASING", ["Fantasy", "Action"], "A player stays logged in as a game shuts down and finds the world has become real.", { year: 2012, chapters: null, volumes: 16, score: 7, listedDaysAgo: 410 }, [run(410, 14, 9, 3)]),
  title("dune", "Dune", "novel", "fiction", "completed", "FINISHED", ["Science Fiction", "Adventure"], "A noble heir is thrust into the politics and prophecy of a desert planet.", { year: 1965, chapters: 48, volumes: 1, score: 9, listedDaysAgo: 275 }, [run(275, 2, 16, 3)], "manual"),
  title("project-hail-mary", "Project Hail Mary", "novel", "fiction", "completed", "FINISHED", ["Science Fiction"], "A lone astronaut wakes with no memory and a mission to save Earth.", { year: 2021, chapters: 30, volumes: 1, score: 10, listedDaysAgo: 880 }, [run(880, 1, 10, 3)], "manual"),
  title("the-hobbit", "The Hobbit", "novel", "fiction", "repeating", "FINISHED", ["Fantasy", "Adventure"], "A comfort-loving hobbit is swept off on a quest for a dragon's hoard.", { year: 1937, chapters: 19, volumes: 1, score: 8, listedDaysAgo: 54 }, [run(54, 4, 9, 2)], "manual"),
  title("piranesi", "Piranesi", "novel", "fiction", "planning", "FINISHED", ["Fantasy", "Mystery"], "A man lives alone in an endless house of statues and tides.", { year: 2020, chapters: null, volumes: 1, score: null, listedDaysAgo: 9 }, [], "manual"),
  title("sapiens", "Sapiens", "other", "non_fiction", "reading", "FINISHED", ["History"], "A sweeping account of how Homo sapiens came to dominate the planet.", { year: 2011, chapters: 20, volumes: 1, score: 7, listedDaysAgo: 48 }, [run(48, 8, 6, 2)], "manual"),
  title("look-back", "Look Back", "one_shot", "manga", "completed", "FINISHED", ["Drama", "Slice of Life"], "Two girls bond over a shared love of drawing manga, until tragedy strikes.", { year: 2021, chapters: 1, volumes: 1, score: 10, listedDaysAgo: 100 }, [run(100, 1, 1, 1)]),
  title("goodbye-eri", "Goodbye, Eri", "one_shot", "manga", "completed", "FINISHED", ["Drama"], "A boy films his dying mother, then meets a girl who changes how he sees film.", { year: 2022, chapters: 1, volumes: 1, score: 9, listedDaysAgo: 98 }, [run(98, 1, 1, 1)]),
  title("saga", "Saga", "other", "comic", "reading", "RELEASING", ["Science Fiction", "Fantasy", "Drama"], "Two lovers from warring worlds fight to raise their daughter in peace.", { year: 2012, chapters: null, volumes: null, score: 8, listedDaysAgo: 200 }, [run(200, 9, 18, 3)], "manual"),
  title("watchmen", "Watchmen", "other", "comic", "completed", "FINISHED", ["Mystery", "Drama"], "Retired heroes investigate a murder in an alternate Cold War America.", { year: 1986, chapters: 12, volumes: 1, score: 9, listedDaysAgo: 720 }, [run(720, 2, 6, 2)], "manual"),
  title("persepolis", "Persepolis", "other", "comic", "planning", "FINISHED", ["Drama", "History"], "A graphic memoir of growing up in Iran during the Islamic Revolution.", { year: 2000, chapters: null, volumes: 2, score: null, listedDaysAgo: 15 }, [], "manual"),
];

export function findReadTitle(id: string): DemoReadTitle | undefined {
  return DEMO_READ_TITLES.find((entry) => entry.id === id);
}
