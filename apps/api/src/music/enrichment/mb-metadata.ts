/** Curated MusicBrainz folksonomy tags that map to mood rather than genre. */
const MOOD_TAGS = new Set([
  "aggressive",
  "atmospheric",
  "calm",
  "chill",
  "dark",
  "dreamy",
  "energetic",
  "happy",
  "melancholic",
  "melancholy",
  "party",
  "romantic",
  "sad",
  "upbeat",
  "angry",
  "anxious",
  "bittersweet",
  "brooding",
  "cheerful",
  "euphoric",
  "gentle",
  "gloomy",
  "intense",
  "mellow",
  "peaceful",
  "playful",
  "relaxing",
  "sensual",
  "somber",
  "triumphant",
]);

export type GenreKind = "genre" | "mood" | "tag";

export function classifyTagKind(name: string): GenreKind {
  const key = name.trim().toLowerCase();
  if (!key) return "tag";
  if (MOOD_TAGS.has(key)) return "mood";
  // Multi-word mood-ish phrases from folksonomy
  if (
    key.includes("feel-good") ||
    key.includes("feel good") ||
    key.endsWith(" mood")
  ) {
    return "mood";
  }
  return "genre";
}

/** Parse a MusicBrainz date string (`YYYY`, `YYYY-MM`, or `YYYY-MM-DD`) to a year. */
export function parseMbYear(date: string | null | undefined): number | null {
  if (!date || typeof date !== "string") return null;
  const match = /^(\d{4})/.exec(date.trim());
  if (!match) return null;
  const year = Number(match[1]);
  if (!Number.isFinite(year) || year < 1000 || year > 2100) return null;
  return year;
}

type MbReleaseLike = {
  id?: string;
  date?: string;
  "release-events"?: { date?: string }[];
};

/** Prefer a release that has a parseable date; otherwise first release. */
export function pickBestRelease(
  releases: MbReleaseLike[] | null | undefined,
): MbReleaseLike | null {
  if (!releases?.length) return null;
  let best: MbReleaseLike | null = null;
  let bestYear: number | null = null;
  for (const r of releases) {
    if (!r?.id) continue;
    const year =
      parseMbYear(r.date) ??
      parseMbYear(r["release-events"]?.[0]?.date);
    if (year != null && (bestYear == null || year < bestYear)) {
      best = r;
      bestYear = year;
    } else if (!best) {
      best = r;
    }
  }
  return best;
}

export function yearFromRelease(release: MbReleaseLike | null | undefined): number | null {
  if (!release) return null;
  return (
    parseMbYear(release.date) ??
    parseMbYear(release["release-events"]?.[0]?.date)
  );
}
