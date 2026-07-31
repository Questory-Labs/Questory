import { Configuration } from "@crawlee/core";
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
