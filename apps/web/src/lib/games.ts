import { api } from "@/lib/api";

function prefixGamesPath(path: string): string {
  return path.startsWith("/games/") ? path : `/games${path}`;
}

export async function gamesFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  return api<T>(prefixGamesPath(path), init);
}
