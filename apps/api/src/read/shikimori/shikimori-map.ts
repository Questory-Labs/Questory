export function mapShikimoriListStatus(status: string): string {
  switch (status.toLowerCase()) {
    case "watching":
    case "reading":
      return "reading";
    case "completed":
      return "completed";
    case "on_hold":
      return "paused";
    case "dropped":
      return "dropped";
    case "planned":
      return "planning";
    case "rewatching":
    case "rereading":
      return "repeating";
    default:
      return "planning";
  }
}

export function shikimoriAnimeProgress(
  episodes: number,
  total: number | null | undefined,
  status: string,
): number {
  if (status.toLowerCase() === "completed") return 100;
  if (total != null && total > 0) {
    return Math.min(100, Math.round((episodes / total) * 100));
  }
  if (episodes > 0) return 50;
  return 0;
}

export function shikimoriMangaProgress(
  chapters: number,
  total: number | null | undefined,
  status: string,
): number {
  if (status.toLowerCase() === "completed") return 100;
  if (total != null && total > 0) {
    return Math.min(100, Math.round((chapters / total) * 100));
  }
  if (chapters > 0) return 50;
  return 0;
}
