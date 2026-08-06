import { randomUUID } from "node:crypto";
import { Configuration, RequestQueue } from "@crawlee/core";
import { MemoryStorage } from "@crawlee/memory-storage";

let configured = false;

/** Crawlee global config: in-memory storage, no ./storage dirs on disk. */
export function ensureScraperCrawleeConfig(): void {
  if (configured) return;
  const storage = new MemoryStorage({
    persistStorage: false,
  });
  Configuration.getGlobalConfig().useStorageClient(storage);
  Configuration.getGlobalConfig().set("persistStorage", false);
  configured = true;
}

/**
 * Run a scrape with a fresh named RequestQueue so repeat runs in the same
 * process are not skipped as already-handled (default queue persists state).
 */
export async function withIsolatedRequestQueue<T>(
  fn: (requestQueue: RequestQueue) => Promise<T>,
): Promise<T> {
  ensureScraperCrawleeConfig();
  const requestQueue = await RequestQueue.open(`scraper-${randomUUID()}`);
  try {
    return await fn(requestQueue);
  } finally {
    await requestQueue.drop();
  }
}
