import {
  DEMO_READ_TITLES,
  type DemoReadTitle,
} from "./read-catalog";
import { eveningTime, seeded } from "./watch-read-shared";

export type DemoReadEvent = {
  id: string;
  title: DemoReadTitle;
  at: Date;
  source: string;
  status: string;
  chaptersRead: number;
  volumesRead: number | null;
  progressChapters: number;
  percent: number | null;
  precision: string;
};

export type DemoReadProgress = {
  chapters: number;
  volumes: number;
};

function volumesFor(title: DemoReadTitle, chapters: number): number {
  const volumes = Math.ceil(chapters / title.chaptersPerVolume);
  return title.volumes != null ? Math.min(title.volumes, volumes) : volumes;
}

function titleEvents(title: DemoReadTitle): DemoReadEvent[] {
  const next = seeded(title.id);
  const events: DemoReadEvent[] = [];
  const cap = title.chapters ?? Number.POSITIVE_INFINITY;
  let progress = 0;
  for (const run of title.runs) {
    for (let i = 0; i < run.sessions; i += 1) {
      const daysBack = run.startDaysAgo - i * run.cadenceDays;
      if (daysBack < 0 || progress >= cap) break;
      const chaptersRead = Math.min(run.chapters, cap - progress);
      progress += chaptersRead;
      events.push({
        id: `${title.id}-event-${events.length + 1}`,
        title,
        at: eveningTime(next, daysBack),
        source: title.source,
        status: "reading",
        chaptersRead,
        volumesRead: volumesFor(title, progress),
        progressChapters: progress,
        percent:
          title.chapters != null
            ? Math.min(100, Math.round((progress / title.chapters) * 100))
            : null,
        precision: title.source === "manual" ? "exact" : "day",
      });
    }
  }
  const last = events[events.length - 1];
  if (last && ["completed", "dropped", "repeating"].includes(title.listStatus)) {
    last.status = title.listStatus;
  }
  return events;
}

export function readEvents(): DemoReadEvent[] {
  return DEMO_READ_TITLES.flatMap(titleEvents).sort(
    (a, b) => b.at.getTime() - a.at.getTime(),
  );
}

const FORMATS = ["manga", "manhwa", "manhua", "novel", "one_shot", "other"] as const;

export function parseFormat(value: unknown): (typeof FORMATS)[number] | undefined {
  return FORMATS.find((format) => format === value);
}

export function filterByFormat(
  events: DemoReadEvent[],
  format: unknown,
): DemoReadEvent[] {
  const parsed = parseFormat(format);
  return parsed ? events.filter((event) => event.title.format === parsed) : events;
}

export function progressByTitle(
  events: DemoReadEvent[],
): Map<string, DemoReadProgress> {
  const progress = new Map<string, DemoReadProgress>();
  for (const event of events) {
    const current = progress.get(event.title.id);
    if (!current || event.progressChapters > current.chapters) {
      progress.set(event.title.id, {
        chapters: event.progressChapters,
        volumes: event.volumesRead ?? 0,
      });
    }
  }
  return progress;
}
