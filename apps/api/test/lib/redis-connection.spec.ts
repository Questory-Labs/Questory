import { describe, expect, it } from "vitest";
import {
  REDIS_TCP_KEEPALIVE_MS,
  bullmqConnection,
  redisClientOptions,
} from "../../src/lib/redis-connection";

describe("redisClientOptions", () => {
  it("enables TCP keepalive and disables per-request retry caps", () => {
    expect(redisClientOptions()).toEqual({
      keepAlive: REDIS_TCP_KEEPALIVE_MS,
      maxRetriesPerRequest: null,
    });
  });
});

describe("bullmqConnection", () => {
  it("passes keepalive through so BullMQ sockets survive idle NAT", () => {
    expect(bullmqConnection("redis://192.168.1.111:6379")).toEqual({
      url: "redis://192.168.1.111:6379",
      keepAlive: REDIS_TCP_KEEPALIVE_MS,
      maxRetriesPerRequest: null,
    });
  });
});
