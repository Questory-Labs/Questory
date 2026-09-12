import { PrismaService } from "../prisma/prisma.service";
import {
  PROFILE_EXPORT_BATCH_SIZE,
  PROFILE_EXPORT_YIELD_EVERY,
} from "./profile-data.constants";
import {
  isoRequired,
  yieldEventLoop,
} from "./profile-data.utils";
import { readTitleRef, watchTitleRef } from "./profile-export-collect";

export async function collectMusicListens(
  prisma: PrismaService,
  userId: string,
) {
  const out: unknown[] = [];
  let cursor: string | undefined;
  let n = 0;
  for (;;) {
    const rows = await prisma.listen.findMany({
      where: { userId, ...(cursor ? { id: { gt: cursor } } : {}) },
      orderBy: { id: "asc" },
      take: PROFILE_EXPORT_BATCH_SIZE,
      include: {
        track: { include: { artist: true, release: true } },
      },
    });
    if (!rows.length) break;
    cursor = rows[rows.length - 1].id;
    for (const row of rows) {
      out.push({
        listenedAt: isoRequired(row.listenedAt),
        artistName: row.track.artist.name,
        trackName: row.track.title,
        releaseName: row.track.release?.title ?? null,
        recordingMbid: row.track.recordingMbid,
        trackMbid: row.track.trackMbid,
        releaseMbid: row.track.release?.mbid ?? row.track.release?.releaseMbid,
        isrc: row.track.isrc,
        spotifyId: row.track.spotifyId,
        durationMs: row.track.durationMs,
        listenType: row.listenType,
        mediaPlayer: row.mediaPlayer,
        submissionClient: row.submissionClient,
        musicService: row.musicService,
      });
      n += 1;
      if (n % PROFILE_EXPORT_YIELD_EVERY === 0) await yieldEventLoop();
    }
    if (rows.length < PROFILE_EXPORT_BATCH_SIZE) break;
  }
  return out;
}

export async function collectWatchEvents(
  prisma: PrismaService,
  userId: string,
) {
  const out: unknown[] = [];
  let cursor: string | undefined;
  let n = 0;
  for (;;) {
    const rows = await prisma.watchEvent.findMany({
      where: { userId, ...(cursor ? { id: { gt: cursor } } : {}) },
      orderBy: { id: "asc" },
      take: PROFILE_EXPORT_BATCH_SIZE,
      include: { title: true, episode: true },
    });
    if (!rows.length) break;
    cursor = rows[rows.length - 1].id;
    for (const row of rows) {
      out.push({
        dedupeKey: row.dedupeKey,
        watchedAt: isoRequired(row.watchedAt),
        source: row.source,
        action: row.action,
        progress: row.progress,
        rating: row.rating,
        runtimeMinutes: row.runtimeMinutes,
        precision: row.precision,
        title: watchTitleRef(row.title),
        episode: row.episode
          ? {
              seasonNumber: row.episode.seasonNumber,
              episodeNumber: row.episode.episodeNumber,
              name: row.episode.name,
              traktId: row.episode.traktId,
              tmdbId: row.episode.tmdbId,
            }
          : null,
      });
      n += 1;
      if (n % PROFILE_EXPORT_YIELD_EVERY === 0) await yieldEventLoop();
    }
    if (rows.length < PROFILE_EXPORT_BATCH_SIZE) break;
  }
  return out;
}

export async function collectReadEvents(
  prisma: PrismaService,
  userId: string,
) {
  const out: unknown[] = [];
  let cursor: string | undefined;
  let n = 0;
  for (;;) {
    const rows = await prisma.readEvent.findMany({
      where: { userId, ...(cursor ? { id: { gt: cursor } } : {}) },
      orderBy: { id: "asc" },
      take: PROFILE_EXPORT_BATCH_SIZE,
      include: { readTitle: true },
    });
    if (!rows.length) break;
    cursor = rows[rows.length - 1].id;
    for (const row of rows) {
      out.push({
        dedupeKey: row.dedupeKey,
        readAt: isoRequired(row.readAt),
        source: row.source,
        action: row.action,
        status: row.status,
        chaptersRead: row.chaptersRead,
        volumesRead: row.volumesRead,
        progress: row.progress,
        rating: row.rating,
        precision: row.precision,
        title: readTitleRef(row.readTitle),
      });
      n += 1;
      if (n % PROFILE_EXPORT_YIELD_EVERY === 0) await yieldEventLoop();
    }
    if (rows.length < PROFILE_EXPORT_BATCH_SIZE) break;
  }
  return out;
}
