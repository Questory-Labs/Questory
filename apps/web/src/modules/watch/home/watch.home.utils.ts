import type { WatchMediaFilter } from "./watch.home.types";

export const typeQuery = (type: WatchMediaFilter): string =>
  type === "all" ? "" : `&type=${type}`;
