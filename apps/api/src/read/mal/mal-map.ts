export function mapMalListStatus(status: string): string {
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
    case "plan_to_watch":
    case "plan_to_read":
      return "planning";
    default:
      return "planning";
  }
}

export function mapMalMangaFormat(): string {
  return "manga";
}

export function malAnimeProgressPercent(
  watched: number,
  total: number | null | undefined,
  status: string,
): number {
  if (status.toLowerCase() === "completed") return 100;
  if (total != null && total > 0) {
    return Math.min(100, Math.round((watched / total) * 100));
  }
  if (watched > 0) return 50;
  return 0;
}

export function malMangaProgressPercent(
  chaptersRead: number,
  chapters: number | null | undefined,
  status: string,
): number {
  if (status.toLowerCase() === "completed") return 100;
  if (chapters != null && chapters > 0) {
    return Math.min(100, Math.round((chaptersRead / chapters) * 100));
  }
  if (chaptersRead > 0) return 50;
  return 0;
}
