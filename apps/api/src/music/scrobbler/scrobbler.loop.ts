import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import type { Queue, Worker, Job } from "bullmq";
import { CacheService } from "../../cache/cache.service";
import { isCronEnabled } from "../../cron/cron-enabled";
import { resolveSyncMode } from "../../lib/runtime-config";
import { CatalogService } from "../catalog/catalog.service";
import { EnrichmentService } from "../enrichment/enrichment.service";
import { PlayingNowService } from "../playing-now/playing-now.service";
import {
  LASTFM_MAX_RPS,
  LASTFM_QUEUE_CONCURRENCY,
  SCROBBLER_AUTH_FAILED,
  SCROBBLER_TICK_MS,
  isScrobblerWorkerProcess,
  shouldRunScrobblerConsumer,
  scaledPollIntervalMs,
  scrobblerJobId,
  scrobblerLockKey,
  type MusicScrobblerProviderId,
} from "./scrobbler.constants";
import { ScrobblerConnections } from "./scrobbler.connections";
import {
  createScrobblerQueue,
  createScrobblerWorker,
  type ScrobblerJobData,
} from "./scrobbler.queue";
import { SCROBBLE_SOURCES } from "./scrobbler.tokens";
import type {
  ScrobbleObservation,
  ScrobbleSource,
  SourceConn,
} from "./scrobbler.types";

class Semaphore {
  private active = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.max) {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
    this.active += 1;
    try {
      return await fn();
    } finally {
      this.active -= 1;
      const next = this.waiters.shift();
      if (next) next();
    }
  }
}

function playingFingerprint(obs: ScrobbleObservation): string {
  const { artistName, trackName } = obs.meta;
  return `${obs.kind}:${artistName}:${trackName}`;
}

function isDuplicateJobError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /already exists|already in|duplicate/i.test(message);
}

@Injectable()
export class ScrobblerLoop implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScrobblerLoop.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private ticking = false;
  private readonly nextDue = new Map<string, number>();
  private readonly playingFp = new Map<string, string>();
  private readonly semaphore = new Semaphore(LASTFM_QUEUE_CONCURRENCY);
  private readonly sourcesById: Map<string, ScrobbleSource>;
  private queue: Queue<ScrobblerJobData> | null = null;
  private worker: Worker<ScrobblerJobData> | null = null;

  constructor(
    @Inject(SCROBBLE_SOURCES) sources: ScrobbleSource[],
    private readonly connections: ScrobblerConnections,
    private readonly catalog: CatalogService,
    private readonly playingNow: PlayingNowService,
    private readonly enrichment: EnrichmentService,
    private readonly cache: CacheService,
  ) {
    this.sourcesById = new Map(
      sources.filter((source) => source.isConfigured()).map((s) => [s.id, s]),
    );
  }

  async onModuleInit() {
    if (this.sourcesById.size === 0) {
      this.logger.log("Scrobbler idle — no configured sources");
      return;
    }

    const queueMode = resolveSyncMode() === "queue";
    const workerProc = isScrobblerWorkerProcess();

    if (queueMode) {
      const redisUrl = (process.env.REDIS_URL || "").trim();
      this.queue = createScrobblerQueue(redisUrl);
      this.queue.on("error", (err) => {
        this.logger.warn(`Scrobbler queue Redis error: ${err.message}`);
      });
      if (!shouldRunScrobblerConsumer()) {
        this.logger.log(
          "Scrobbler HTTP process queues polls to music-scrobble (SCROBBLER_IN_API=false; run PROCESS_ROLE=scrobbler worker)",
        );
        return;
      }
      this.worker = createScrobblerWorker(redisUrl, (job) => this.processJob(job));
      this.worker.on("error", (err) => {
        this.logger.warn(`Scrobbler worker Redis error: ${err.message}`);
      });
      this.worker.on("failed", (job, err) => {
        this.logger.error(`Scrobbler job ${job?.id} failed: ${err.message}`);
      });
      if (!isCronEnabled()) {
        this.logger.log(
          "Scrobbler worker consuming jobs (scheduler off — CRON_ENABLED=false)",
        );
        return;
      }
      this.startTimer();
      void this.tick().catch((err) =>
        this.logger.error(
          `Scrobbler first tick failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
      this.logger.log(
        `Scrobbler worker started ${workerProc ? "(dedicated process)" : "(in API process)"} (${[...this.sourcesById.keys()].join(", ")}, concurrency=${LASTFM_QUEUE_CONCURRENCY}, cap=${LASTFM_MAX_RPS}/s)`,
      );
      return;
    }

    if (workerProc) {
      this.logger.log("Inline sync — scrobbler worker not used (API process polls)");
      return;
    }
    if (!isCronEnabled()) {
      this.logger.log("Scrobbler loop disabled (CRON_ENABLED=false)");
      return;
    }
    this.startTimer();
    void this.tick().catch((err) =>
      this.logger.error(
        `Scrobbler first tick failed: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
    this.logger.log(
      `Scrobbler inline loop started (${[...this.sourcesById.keys()].join(", ")})`,
    );
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.worker) await this.worker.close();
    if (this.queue) await this.queue.close();
  }

  async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const conns = await this.connections.listActive();
      const now = Date.now();
      const byProvider = new Map<string, SourceConn[]>();
      for (const conn of conns) {
        const list = byProvider.get(conn.provider) ?? [];
        list.push(conn);
        byProvider.set(conn.provider, list);
      }
      const work: Array<Promise<void>> = [];
      for (const [provider, rows] of byProvider) {
        const source = this.sourcesById.get(provider);
        if (!source) continue;
        const interval = scaledPollIntervalMs(
          rows.length,
          source.pollIntervalMs,
          LASTFM_MAX_RPS,
        );
        for (const conn of rows) {
          work.push(this.dispatchIfDue(conn, source, interval, now));
        }
      }
      await Promise.all(work);
    } finally {
      this.ticking = false;
    }
  }

  async pollNow(userId: string, provider: MusicScrobblerProviderId): Promise<void> {
    const source = this.sourcesById.get(provider);
    if (!source) return;
    const conn = await this.connections.get(userId, provider);
    if (!conn) return;
    await this.dispatch(conn, source);
  }

  private startTimer() {
    this.timer = setInterval(() => {
      void this.tick().catch((err) =>
        this.logger.error(
          `Scrobbler tick failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }, SCROBBLER_TICK_MS);
    this.timer.unref?.();
  }

  private dueKey(conn: SourceConn) {
    return `${conn.userId}:${conn.provider}`;
  }

  private async dispatchIfDue(
    conn: SourceConn,
    source: ScrobbleSource,
    intervalMs: number,
    now: number,
  ): Promise<void> {
    const key = this.dueKey(conn);
    let due = this.nextDue.get(key);
    if (due == null) {
      due = now;
      this.nextDue.set(key, due);
    }
    if (now < due) return;
    await this.dispatch(conn, source);
    this.nextDue.set(key, Date.now() + intervalMs);
  }

  private async dispatch(conn: SourceConn, source: ScrobbleSource): Promise<void> {
    if (this.queue) {
      await this.enqueue(conn);
      return;
    }
    await this.semaphore.run(() => this.pollOne(conn, source));
  }

  private async enqueue(conn: SourceConn): Promise<void> {
    if (!this.queue) return;
    try {
      await this.queue.add(
        "poll",
        {
          userId: conn.userId,
          provider: conn.provider as MusicScrobblerProviderId,
        },
        {
          jobId: scrobblerJobId(conn.provider, conn.userId),
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    } catch (err) {
      if (!isDuplicateJobError(err)) throw err;
    }
  }

  private async processJob(job: Job<ScrobblerJobData>): Promise<void> {
    const source = this.sourcesById.get(job.data.provider);
    if (!source) return;
    const conn = await this.connections.get(job.data.userId, job.data.provider);
    if (!conn) return;
    await this.pollOne(conn, source);
  }

  private async pollOne(conn: SourceConn, source: ScrobbleSource): Promise<void> {
    const lockTtl = Math.max(15, Math.ceil(source.pollIntervalMs / 1000));
    const locked = await this.cache.acquireLock(
      scrobblerLockKey(conn.provider, conn.userId),
      lockTtl,
    );
    if (!locked) return;

    try {
      const session = await source.ensureSession(conn);
      const result = await source.poll(session);
      if (result.authFailed) {
        await this.connections.updatePoll(conn.id, {
          lastError: SCROBBLER_AUTH_FAILED,
        });
        return;
      }
      await this.apply(conn.userId, result.observations);
      await this.connections.updatePoll(conn.id, {
        syncCursor: result.nextCursor ?? conn.syncCursor,
        lastSyncedAt: new Date(),
        lastError: result.error ?? null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Scrobbler ${conn.provider} ${conn.userId}: ${message}`,
      );
    }
  }

  private async apply(
    userId: string,
    observations: ScrobbleObservation[],
  ): Promise<void> {
    let hadListen = false;
    let playing: ScrobbleObservation | undefined;
    for (const obs of observations) {
      if (obs.kind === "listen") {
        const result = await this.catalog.upsertListen(userId, obs.meta);
        void this.enrichment.enqueueTrack(result.track.id);
        hadListen = true;
      } else {
        playing = obs;
      }
    }

    const fpKey = userId;
    if (playing) {
      const fp = playingFingerprint(playing);
      if (this.playingFp.get(fpKey) !== fp) {
        await this.playingNow.submit(userId, playing.meta);
        this.playingFp.set(fpKey, fp);
      }
    } else if (hadListen || this.playingFp.has(fpKey)) {
      await this.playingNow.clear(userId);
      this.playingFp.delete(fpKey);
    }
  }
}
