import { DEMO_MOVIES, type DemoWatchTitle } from "./watch-catalog";
import { DEMO_EPISODE_NAMES, DEMO_SHOWS, type DemoShow } from "./watch-catalog-shows";
import { eveningTime, seeded } from "./watch-read-shared";

export type DemoWatchEvent = {
  id: string;
  title: DemoWatchTitle;
  at: Date;
  source: string;
  precision: string;
  rating: number | null;
  progress: number;
  episode: {
    id: string;
    seasonNumber: number;
    episodeNumber: number;
    name: string | null;
  } | null;
  minutes: number;
};

export function episodeName(titleId: string, season: number, episode: number) {
  return DEMO_EPISODE_NAMES[titleId]?.[`${season}:${episode}`] ?? null;
}

export function episodeAt(show: DemoShow, index: number) {
  let remaining = index;
  for (let s = 0; s < show.seasons.length; s += 1) {
    const size = show.seasons[s]!;
    if (remaining < size) {
      return { seasonNumber: s + 1, episodeNumber: remaining + 1 };
    }
    remaining -= size;
  }
  return null;
}

export function totalEpisodes(show: DemoShow): number {
  return show.seasons.reduce((sum, size) => sum + size, 0);
}

function showEvents(show: DemoShow): DemoWatchEvent[] {
  const next = seeded(show.id);
  const total = totalEpisodes(show);
  const events: DemoWatchEvent[] = [];
  let index = 0;
  for (const run of show.runs) {
    const count = Math.min(run.count ?? total - index, total - index);
    for (let i = 0; i < count; i += 1) {
      const daysBack = run.startDaysAgo - Math.floor(i / run.batch) * run.cadenceDays;
      if (daysBack < 0) break;
      const ref = episodeAt(show, index);
      if (!ref) break;
      const { seasonNumber, episodeNumber } = ref;
      events.push({
        id: `demo-watch-${show.id.replace("demo-title-", "")}-${index + 1}`,
        title: show,
        at: eveningTime(next, daysBack),
        source: show.source,
        precision: "exact",
        rating: index === total - 1 ? (show.finalRating ?? null) : null,
        progress: 100,
        episode: {
          id: `${show.id}-s${seasonNumber}e${episodeNumber}`,
          seasonNumber,
          episodeNumber,
          name: episodeName(show.id, seasonNumber, episodeNumber),
        },
        minutes: show.runtime,
      });
      index += 1;
    }
  }
  return events;
}

function movieEvents(): DemoWatchEvent[] {
  return DEMO_MOVIES.flatMap((title) => {
    const next = seeded(title.id);
    return title.watchedDaysAgo.map((daysBack, i) => ({
      id: `demo-watch-${title.id.replace("demo-title-", "")}-${i + 1}`,
      title,
      at: eveningTime(next, daysBack),
      source: title.source,
      precision: title.source === "letterboxd" ? "day" : "exact",
      rating: title.rating,
      progress: title.progress,
      episode: null,
      minutes: Math.round((title.runtime * title.progress) / 100),
    }));
  });
}

export function watchEvents(): DemoWatchEvent[] {
  return [...DEMO_SHOWS.flatMap(showEvents), ...movieEvents()].sort(
    (a, b) => b.at.getTime() - a.at.getTime(),
  );
}

export function eventsForTitle(
  events: DemoWatchEvent[],
  titleId: string,
): DemoWatchEvent[] {
  return events.filter((event) => event.title.id === titleId);
}

export function filterByType(
  events: DemoWatchEvent[],
  type: unknown,
): DemoWatchEvent[] {
  return type === "movie" || type === "show"
    ? events.filter((event) => event.title.type === type)
    : events;
}
