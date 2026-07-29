export function mapBangumiCollectionType(type: string): string {
  switch (type.toLowerCase()) {
    case "do":
      return "reading";
    case "collect":
      return "completed";
    case "wish":
      return "planning";
    case "on_hold":
      return "paused";
    case "dropped":
      return "dropped";
    default:
      return "planning";
  }
}

export function bangumiAnimeProgress(
  epStatus: number,
  total: number | null | undefined,
  type: string,
): number {
  if (type.toLowerCase() === "collect") return 100;
  if (total != null && total > 0) {
    return Math.min(100, Math.round((epStatus / total) * 100));
  }
  if (epStatus > 0) return 50;
  return 0;
}

export function bangumiMangaProgress(
  volStatus: number,
  total: number | null | undefined,
  type: string,
): number {
  if (type.toLowerCase() === "collect") return 100;
  if (total != null && total > 0) {
    return Math.min(100, Math.round((volStatus / total) * 100));
  }
  if (volStatus > 0) return 50;
  return 0;
}
