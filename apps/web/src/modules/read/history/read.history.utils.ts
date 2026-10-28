import type { ReadRecentEvent } from "@questorylabs/shared";

export const readEventTitle = (e: ReadRecentEvent): string => {
  if (e.chaptersRead != null) return `${e.title.name} · Ch. ${e.chaptersRead}`;
  if (e.volumesRead != null) return `${e.title.name} · Vol. ${e.volumesRead}`;
  return e.title.name;
};
