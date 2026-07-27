/** Map AniList Media.format → ReadTitle.format. */
export function mapAniListMangaFormat(format?: string | null): string {
  switch ((format || "").toUpperCase()) {
    case "MANGA":
      return "manga";
    case "MANHWA":
      return "manhwa";
    case "MANHUA":
      return "manhua";
    case "NOVEL":
      return "novel";
    case "ONE_SHOT":
      return "one_shot";
    default:
      return "other";
  }
}

/** Map AniList MediaList status → ReadListState.listStatus. */
export function mapAniListListStatus(status: string): string {
  switch (status.toUpperCase()) {
    case "CURRENT":
      return "reading";
    case "COMPLETED":
      return "completed";
    case "PLANNING":
      return "planning";
    case "PAUSED":
      return "paused";
    case "DROPPED":
      return "dropped";
    case "REPEATING":
      return "repeating";
    default:
      return "planning";
  }
}

/** Chapter progress as 0–100. */
export function mangaProgressPercent(
  progress: number,
  chapters: number | null | undefined,
  status: string,
): number {
  if (status.toUpperCase() === "COMPLETED") return 100;
  if (chapters != null && chapters > 0) {
    return Math.min(100, Math.round((progress / chapters) * 100));
  }
  if (progress > 0) return 50;
  return 0;
}
