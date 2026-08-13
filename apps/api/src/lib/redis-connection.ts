import type { ConnectionOptions } from "bullmq";
import type { RedisOptions } from "ioredis";

/** TCP keepalive so idle LAN/NAT Redis links are not silently RST'd. */
export const REDIS_TCP_KEEPALIVE_MS = 10_000;

/**
 * Shared ioredis/BullMQ socket options.
 * `maxRetriesPerRequest: null` is required for BullMQ blocking connections.
 */
export function redisClientOptions(): Pick<
  RedisOptions,
  "keepAlive" | "maxRetriesPerRequest"
> {
  return {
    keepAlive: REDIS_TCP_KEEPALIVE_MS,
    maxRetriesPerRequest: null,
  };
}

export function bullmqConnection(url: string): ConnectionOptions {
  return {
    url,
    ...redisClientOptions(),
  };
}
