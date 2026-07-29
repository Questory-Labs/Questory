export function mapKitsuListStatus(status: string): string {
  switch (status.toLowerCase()) {
    case "current":
      return "reading";
    case "completed":
      return "completed";
    case "on_hold":
      return "paused";
    case "dropped":
      return "dropped";
    case "planned":
      return "planning";
    default:
      return "planning";
  }
}

export function kitsuAnimeProgress(
  progress: number,
  total: number | null | undefined,
  status: string,
): number {
  if (status.toLowerCase() === "completed") return 100;
  if (total != null && total > 0) {
    return Math.min(100, Math.round((progress / total) * 100));
  }
  if (progress > 0) return 50;
  return 0;
}

export function kitsuMangaProgress(
  progress: number,
  total: number | null | undefined,
  status: string,
): number {
  return kitsuAnimeProgress(progress, total, status);
}
