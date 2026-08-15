import { Queue, Worker, type Job } from "bullmq";
import { bullmqConnection } from "../../lib/redis-connection";
import {
  LASTFM_MAX_RPS,
  LASTFM_QUEUE_CONCURRENCY,
  SCROBBLER_QUEUE_NAME,
  type MusicScrobblerProviderId,
} from "./scrobbler.constants";

export type ScrobblerJobData = {
  userId: string;
  provider: MusicScrobblerProviderId;
};

export function createScrobblerQueue(redisUrl: string) {
  return new Queue<ScrobblerJobData>(SCROBBLER_QUEUE_NAME, {
    connection: bullmqConnection(redisUrl),
  });
}

export function createScrobblerWorker(
  redisUrl: string,
  processor: (job: Job<ScrobblerJobData>) => Promise<void>,
) {
  return new Worker<ScrobblerJobData>(SCROBBLER_QUEUE_NAME, processor, {
    connection: bullmqConnection(redisUrl),
    concurrency: LASTFM_QUEUE_CONCURRENCY,
    limiter: { max: LASTFM_MAX_RPS, duration: 1000 },
  });
}
