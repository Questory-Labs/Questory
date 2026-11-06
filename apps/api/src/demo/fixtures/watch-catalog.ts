import { DEMO_SHOWS, type DemoShow } from "./watch-catalog-shows";

export type DemoMovie = {
  id: string;
  name: string;
  type: "movie";
  year: number;
  overview: string;
  genres: string[];
  runtime: number;
  status: string;
  source: string;
  anime: boolean;
  watchedDaysAgo: number[];
  rating: number | null;
  progress: number;
};

export type DemoWatchTitle = DemoMovie | DemoShow;

function movie(
  slug: string,
  name: string,
  year: number,
  runtime: number,
  genres: string[],
  overview: string,
  watchedDaysAgo: number[],
  rating: number | null,
  extra: Partial<Pick<DemoMovie, "source" | "anime" | "progress">> = {},
): DemoMovie {
  return {
    id: `demo-title-${slug}`,
    name,
    type: "movie",
    year,
    overview,
    genres,
    runtime,
    status: "Released",
    source: extra.source ?? "letterboxd",
    anime: extra.anime ?? false,
    watchedDaysAgo,
    rating,
    progress: extra.progress ?? 100,
  };
}

export const DEMO_MOVIES: DemoMovie[] = [
  movie("dune-part-two", "Dune: Part Two", 2024, 166, ["Science Fiction", "Adventure"], "Paul Atreides unites with the Fremen while seeking revenge against the conspirators who destroyed his family.", [5, 240], 5),
  movie("dune", "Dune", 2021, 155, ["Science Fiction", "Adventure"], "A noble family becomes embroiled in a war for control of the galaxy's most valuable asset.", [250, 900], 4.5),
  movie("oppenheimer", "Oppenheimer", 2023, 180, ["Drama", "History"], "The story of the physicist who led the project that built the atomic bomb.", [42], 4.5),
  movie("parasite", "Parasite", 2019, 132, ["Thriller", "Drama", "Comedy"], "A poor family schemes its way into the household of a wealthy one.", [78, 610], 5),
  movie("spirited-away", "Spirited Away", 2001, 125, ["Animation", "Fantasy", "Family"], "A girl wanders into a world of spirits and must work to free her parents.", [110, 730], 5, { anime: true }),
  movie("arrival", "Arrival", 2016, 116, ["Science Fiction", "Drama"], "A linguist is recruited to communicate with extraterrestrial visitors.", [148, 540], 4.5),
  movie("mad-max-fury-road", "Mad Max: Fury Road", 2015, 120, ["Action", "Adventure"], "A drifter and a rebel commander flee a tyrant across a desert wasteland.", [186, 800], 5),
  movie("interstellar", "Interstellar", 2014, 169, ["Science Fiction", "Drama"], "Explorers travel through a wormhole in search of a new home for humanity.", [222, 438], 4.5),
  movie("everything-everywhere", "Everything Everywhere All at Once", 2022, 139, ["Science Fiction", "Comedy", "Action"], "A laundromat owner discovers she can access her parallel-universe selves.", [268], 5),
  movie("blade-runner-2049", "Blade Runner 2049", 2017, 164, ["Science Fiction", "Thriller"], "A young blade runner uncovers a secret that could plunge society into chaos.", [305], 4),
  movie("whiplash", "Whiplash", 2014, 107, ["Drama", "Music"], "A driven jazz drummer is pushed to his limit by a ruthless instructor.", [165, 342], 4.5),
  movie("your-name", "Your Name", 2016, 106, ["Animation", "Romance", "Fantasy"], "Two strangers find themselves mysteriously swapping bodies.", [380], 4.5, { anime: true, source: "anilist" }),
  movie("knives-out", "Knives Out", 2019, 130, ["Mystery", "Comedy"], "A detective investigates the death of a wealthy crime novelist.", [360, 418], 4),
  movie("past-lives", "Past Lives", 2023, 106, ["Drama", "Romance"], "Two childhood friends reunite decades later and weigh the lives they might have lived.", [456], 4.5),
  movie("across-the-spider-verse", "Spider-Man: Across the Spider-Verse", 2023, 140, ["Animation", "Action", "Adventure"], "Miles Morales is catapulted across the Multiverse and clashes with a society of Spider-People.", [494], 5),
  movie("poor-things", "Poor Things", 2023, 141, ["Comedy", "Drama", "Fantasy"], "A woman brought back to life sets out to discover the world on her own terms.", [20], null, { progress: 55 }),
  movie("grand-budapest", "The Grand Budapest Hotel", 2014, 100, ["Comedy", "Drama"], "A concierge and his lobby boy are caught up in the theft of a priceless painting.", [570], 4),
  movie("princess-mononoke", "Princess Mononoke", 1997, 134, ["Animation", "Fantasy", "Adventure"], "A cursed prince is caught in a war between forest gods and an iron-mining town.", [648], 4.5, { anime: true }),
  movie("get-out", "Get Out", 2017, 104, ["Horror", "Thriller"], "A young man uncovers a disturbing secret on a visit to his girlfriend's family.", [686], 4),
  movie("la-la-land", "La La Land", 2016, 128, ["Romance", "Music", "Drama"], "An actress and a jazz pianist fall in love while chasing their dreams in Los Angeles.", [724], 4),
  movie("the-matrix", "The Matrix", 1999, 136, ["Science Fiction", "Action"], "A hacker learns that his reality is a simulation controlled by machines.", [745, 762], 4.5),
  movie("inception", "Inception", 2010, 148, ["Science Fiction", "Thriller"], "A thief who steals secrets through dreams is tasked with planting an idea.", [665, 838], 4),
  movie("the-social-network", "The Social Network", 2010, 120, ["Drama"], "The founding of a social media giant fractures a friendship.", [876], 4),
  movie("perfect-blue", "Perfect Blue", 1997, 81, ["Animation", "Thriller", "Horror"], "A pop idol turned actress loses her grip on reality as a stalker closes in.", [914], 4.5, { anime: true, source: "anilist" }),
  movie("anatomy-of-a-fall", "Anatomy of a Fall", 2023, 151, ["Drama", "Mystery"], "A writer is put on trial after her husband is found dead outside their chalet.", [952], 4.5),
  movie("aftersun", "Aftersun", 2022, 102, ["Drama"], "A woman reflects on a holiday she took with her father twenty years earlier.", [12], null, { progress: 40 }),
  movie("the-holdovers", "The Holdovers", 2023, 133, ["Comedy", "Drama"], "A curmudgeonly teacher and a troubled student spend the holidays at a boarding school.", [990], 4),
  movie("akira", "Akira", 1988, 124, ["Animation", "Science Fiction", "Action"], "A biker gang member gains dangerous psychic powers in a neon-lit Neo-Tokyo.", [1040], 4, { anime: true }),
];

export const DEMO_WATCH_TITLES: DemoWatchTitle[] = [...DEMO_SHOWS, ...DEMO_MOVIES];

export function findWatchTitle(id: string): DemoWatchTitle | undefined {
  return DEMO_WATCH_TITLES.find((title) => title.id === id);
}
