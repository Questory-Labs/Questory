/** Optional watch sync hooks — provided when WatchModule is loaded. */
export const WATCH_CRON_SYNC = Symbol("WATCH_CRON_SYNC");

export type WatchCronSync = {
  runTraktSync: () => Promise<unknown>;
  runAnilistSync: () => Promise<unknown>;
  runMalSync: () => Promise<unknown>;
  runKitsuSync: () => Promise<unknown>;
  runBangumiSync: () => Promise<unknown>;
  runShikimoriSync: () => Promise<unknown>;
};
