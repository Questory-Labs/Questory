import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { resolveRedisConfig } from "../lib/runtime-config";
import { randomBytes } from "crypto";

type MemoryEntry = { value: string; expiresAt: number | null };

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis | null = null;
  private readonly memory = new Map<string, MemoryEntry>();
  readonly enabled: boolean;
  readonly mode: "redis" | "memory";

  constructor() {
    const config = resolveRedisConfig();
    this.enabled = config.enabled;
    this.mode = config.mode;

    if (config.enabled && config.url) {
      this.client = new Redis(config.url, {
        maxRetriesPerRequest: null,
        lazyConnect: true,
        enableOfflineQueue: false,
      });
      this.client.on("error", (err) => {
        this.logger.warn(`Redis error, falling back to memory: ${err.message}`);
      });
      this.logger.log(
        `Cache: Redis enabled (${config.url.replace(/\/\/.*@/, "//***@")})`,
      );
    } else if (config.forceInline && config.url) {
      this.logger.log(
        "Cache: REDIS_URL set but USE_INLINE_SYNC=true — using in-memory cache",
      );
    } else {
      this.logger.log("Cache: REDIS_URL unset — using in-memory cache");
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        // ignore
      }
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (this.client) {
      try {
        if (this.client.status !== "ready") {
          await this.client.connect();
        }
        const raw = await this.client.get(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
      } catch {
        // fall through to memory
      }
    }
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return JSON.parse(entry.value) as T;
  }

  async setJson(key: string, value: unknown, ttlSeconds = 3600) {
    const raw = JSON.stringify(value);
    if (this.client) {
      try {
        if (this.client.status !== "ready") {
          await this.client.connect();
        }
        await this.client.set(key, raw, "EX", ttlSeconds);
        return;
      } catch {
        // fall through to memory
      }
    }
    this.memory.set(key, {
      value: raw,
      expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  async del(key: string): Promise<void> {
    this.memory.delete(key);
    if (this.client) {
      try {
        if (this.client.status !== "ready") {
          await this.client.connect();
        }
        await this.client.del(key);
      } catch {
        // ignore — memory already cleared
      }
    }
  }

  /**
   * Acquire a short-lived lock. Redis: SET key token EX ttl NX.
   * Memory: insert-if-absent with expiry (same process only).
   */
  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const token = randomBytes(8).toString("hex");
    const ttl = Math.max(1, Math.floor(ttlSeconds));

    if (this.client) {
      try {
        if (this.client.status !== "ready") {
          await this.client.connect();
        }
        const result = await this.client.set(key, token, "EX", ttl, "NX");
        if (result === "OK") return true;
        return false;
      } catch {
        // fall through to memory
      }
    }

    const existing = this.memory.get(key);
    if (existing && (!existing.expiresAt || existing.expiresAt >= Date.now())) {
      return false;
    }
    this.memory.set(key, {
      value: token,
      expiresAt: Date.now() + ttl * 1000,
    });
    return true;
  }

  async releaseLock(key: string): Promise<void> {
    await this.del(key);
  }

  /** Atomic-ish increment with TTL on first create. Used for auth rate limits. */
  async incr(key: string, ttlSeconds: number): Promise<number> {
    const ttl = Math.max(1, Math.floor(ttlSeconds));
    if (this.client) {
      try {
        if (this.client.status !== "ready") {
          await this.client.connect();
        }
        const count = await this.client.incr(key);
        if (count === 1) {
          await this.client.expire(key, ttl);
        }
        return count;
      } catch {
        // fall through to memory
      }
    }
    const existing = this.memory.get(key);
    let count = 1;
    if (existing && (!existing.expiresAt || existing.expiresAt >= Date.now())) {
      count = Number(existing.value || "0") + 1;
      this.memory.set(key, {
        value: String(count),
        expiresAt: existing.expiresAt,
      });
    } else {
      this.memory.set(key, {
        value: "1",
        expiresAt: Date.now() + ttl * 1000,
      });
    }
    return count;
  }

  async getString(key: string): Promise<string | null> {
    if (this.client) {
      try {
        if (this.client.status !== "ready") {
          await this.client.connect();
        }
        return await this.client.get(key);
      } catch {
        // fall through
      }
    }
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return entry.value;
  }

  async setString(key: string, value: string, ttlSeconds: number): Promise<void> {
    const ttl = Math.max(1, Math.floor(ttlSeconds));
    if (this.client) {
      try {
        if (this.client.status !== "ready") {
          await this.client.connect();
        }
        await this.client.set(key, value, "EX", ttl);
        return;
      } catch {
        // fall through
      }
    }
    this.memory.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
    });
  }
}
