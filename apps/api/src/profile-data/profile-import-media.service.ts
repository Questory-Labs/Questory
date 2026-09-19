import { Injectable } from "@nestjs/common";
import type { QuestoryProfileArchive } from "@questorylabs/shared";
import { PrismaService } from "../prisma/prisma.service";
import {
  CatalogService as MusicCatalogService,
  createImportEntityCache,
} from "../music/catalog/catalog.service";
import { CatalogService as WatchCatalogService } from "../watch/catalog/catalog.service";
import { ReadCatalogService } from "../read/catalog/catalog.service";
import { yieldEventLoop } from "./profile-data.utils";
import { PROFILE_EXPORT_YIELD_EVERY } from "./profile-data.constants";
import type { ApplyCounts } from "./profile-import-games.service";

@Injectable()
export class ProfileImportMediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly musicCatalog: MusicCatalogService,
    private readonly watchCatalog: WatchCatalogService,
    private readonly readCatalog: ReadCatalogService,
  ) {}

  async applyMusic(
    userId: string,
    archive: QuestoryProfileArchive,
  ): Promise<ApplyCounts> {
    let accepted = 0;
    let skipped = 0;

    for (const row of archive.music.rules) {
      const existing = await this.prisma.userMusicRule.findFirst({
        where: {
          userId,
          kind: row.kind,
          matchArtistNorm: row.matchArtistNorm,
          matchAlbumNorm: row.matchAlbumNorm ?? null,
          matchTrackNorm: row.matchTrackNorm ?? null,
        },
      });
      if (existing) {
        skipped += 1;
        continue;
      }
      const artists = [];
      for (const a of row.targetArtists) {
        artists.push(
          await this.musicCatalog.upsertArtistPublic(a.name, a.mbid ?? null),
        );
      }
      const rule = await this.prisma.userMusicRule.create({
        data: {
          userId,
          kind: row.kind,
          matchArtistNorm: row.matchArtistNorm,
          matchAlbumNorm: row.matchAlbumNorm ?? null,
          matchTrackNorm: row.matchTrackNorm ?? null,
          targetTrackTitle: row.targetTrackTitle ?? null,
          targetAlbumTitle: row.targetAlbumTitle ?? null,
          artistCredit: row.artistCredit ?? null,
        },
      });
      for (let i = 0; i < artists.length; i += 1) {
        await this.prisma.userMusicRuleArtist.create({
          data: {
            ruleId: rule.id,
            artistId: artists[i].id,
            position: i,
          },
        });
      }
      accepted += 1;
    }

    for (const row of archive.music.labels) {
      const entityId = await this.resolveLabelEntity(row);
      if (!entityId) {
        skipped += 1;
        continue;
      }
      await this.prisma.userMusicLabel.upsert({
        where: {
          userId_entityKind_entityId: {
            userId,
            entityKind: row.entityKind,
            entityId,
          },
        },
        create: {
          userId,
          entityKind: row.entityKind,
          entityId,
          displayName: row.displayName,
        },
        update: { displayName: row.displayName },
      });
      accepted += 1;
    }

    const cache = createImportEntityCache();
    let n = 0;
    for (const row of archive.music.listens) {
      const result = await this.musicCatalog.upsertListen(
        userId,
        {
          artistName: row.artistName,
          trackName: row.trackName,
          releaseName: row.releaseName,
          listenedAt: new Date(row.listenedAt),
          listenType: row.listenType,
          recordingMbid: row.recordingMbid,
          trackMbid: row.trackMbid,
          releaseMbid: row.releaseMbid,
          isrc: row.isrc,
          spotifyId: row.spotifyId,
          durationMs: row.durationMs,
          mediaPlayer: row.mediaPlayer,
          submissionClient: row.submissionClient,
          musicService: row.musicService,
        },
        cache,
      );
      if (result.created) accepted += 1;
      else skipped += 1;
      n += 1;
      if (n % PROFILE_EXPORT_YIELD_EVERY === 0) await yieldEventLoop();
    }

    return { accepted, skipped };
  }

  async applyWatch(
    userId: string,
    archive: QuestoryProfileArchive,
  ): Promise<ApplyCounts> {
    let accepted = 0;
    let skipped = 0;
    let n = 0;
    for (const row of archive.watch.events) {
      const title = await this.watchCatalog.upsertTitle({
        type: row.title.type,
        name: row.title.name,
        year: row.title.year,
        traktId: row.title.traktId,
        tmdbId: row.title.tmdbId,
        imdbId: row.title.imdbId,
        anilistId: row.title.anilistId,
        malId: row.title.malId,
        kitsuId: row.title.kitsuId,
        bangumiId: row.title.bangumiId,
        shikimoriId: row.title.shikimoriId,
      });
      let episodeId: string | null = null;
      if (row.episode) {
        const episode = await this.watchCatalog.upsertEpisode({
          titleId: title.id,
          seasonNumber: row.episode.seasonNumber,
          episodeNumber: row.episode.episodeNumber,
          name: row.episode.name,
          traktId: row.episode.traktId,
          tmdbId: row.episode.tmdbId,
        });
        episodeId = episode.id;
      }
      const before = await this.prisma.watchEvent.findUnique({
        where: {
          userId_dedupeKey: { userId, dedupeKey: row.dedupeKey },
        },
      });
      await this.watchCatalog.recordWatch({
        userId,
        titleId: title.id,
        episodeId,
        watchedAt: new Date(row.watchedAt),
        source: row.source,
        dedupeKey: row.dedupeKey,
        action: row.action,
        progress: row.progress,
        rating: row.rating,
        runtimeMinutes: row.runtimeMinutes,
        precision: row.precision,
      });
      if (before) skipped += 1;
      else accepted += 1;
      n += 1;
      if (n % PROFILE_EXPORT_YIELD_EVERY === 0) await yieldEventLoop();
    }

    for (const row of archive.watch.listStates) {
      const title = await this.watchCatalog.upsertTitle({
        type: row.title.type,
        name: row.title.name,
        year: row.title.year,
        traktId: row.title.traktId,
        tmdbId: row.title.tmdbId,
        imdbId: row.title.imdbId,
        anilistId: row.title.anilistId,
        malId: row.title.malId,
        kitsuId: row.title.kitsuId,
        bangumiId: row.title.bangumiId,
        shikimoriId: row.title.shikimoriId,
      });
      await this.watchCatalog.upsertListState({
        userId,
        titleId: title.id,
        listType: row.listType,
        source: row.source,
        rating: row.rating,
        listedAt: row.listedAt ? new Date(row.listedAt) : null,
      });
      accepted += 1;
    }
    return { accepted, skipped };
  }

  async applyRead(
    userId: string,
    archive: QuestoryProfileArchive,
  ): Promise<ApplyCounts> {
    let accepted = 0;
    let skipped = 0;
    let n = 0;
    for (const row of archive.read.events) {
      const title = await this.readCatalog.upsertTitle({
        format: row.title.format,
        name: row.title.name,
        year: row.title.year,
        anilistId: row.title.anilistId,
        malId: row.title.malId,
        kitsuId: row.title.kitsuId,
        bangumiId: row.title.bangumiId,
        shikimoriId: row.title.shikimoriId,
      });
      const before = await this.prisma.readEvent.findUnique({
        where: {
          userId_dedupeKey: { userId, dedupeKey: row.dedupeKey },
        },
      });
      await this.readCatalog.recordProgress({
        userId,
        readTitleId: title.id,
        readAt: new Date(row.readAt),
        source: row.source,
        dedupeKey: row.dedupeKey,
        action: row.action,
        status: row.status,
        chaptersRead: row.chaptersRead,
        volumesRead: row.volumesRead,
        progress: row.progress,
        rating: row.rating,
        precision: row.precision,
      });
      if (before) skipped += 1;
      else accepted += 1;
      n += 1;
      if (n % PROFILE_EXPORT_YIELD_EVERY === 0) await yieldEventLoop();
    }

    for (const row of archive.read.listStates) {
      const title = await this.readCatalog.upsertTitle({
        format: row.title.format,
        name: row.title.name,
        year: row.title.year,
        anilistId: row.title.anilistId,
        malId: row.title.malId,
        kitsuId: row.title.kitsuId,
        bangumiId: row.title.bangumiId,
        shikimoriId: row.title.shikimoriId,
      });
      await this.readCatalog.upsertListState({
        userId,
        readTitleId: title.id,
        listStatus: row.listStatus,
        source: row.source,
        score: row.score,
        progressChapters: row.progressChapters,
        progressVolumes: row.progressVolumes,
        listedAt: row.listedAt ? new Date(row.listedAt) : null,
      });
      accepted += 1;
    }
    return { accepted, skipped };
  }

  private async resolveLabelEntity(row: {
    entityKind: "artist" | "release" | "track";
    artistName?: string | null;
    title?: string | null;
    mbid?: string | null;
  }): Promise<string | null> {
    if (row.entityKind === "artist") {
      if (!row.artistName) return null;
      const artist = await this.musicCatalog.upsertArtistPublic(
        row.artistName,
        row.mbid ?? null,
      );
      return artist.id;
    }
    if (!row.artistName || !row.title) return null;
    const trackId = await this.musicCatalog.peekIncomingTrackId({
      artistName: row.artistName,
      trackName: row.entityKind === "track" ? row.title : row.title,
      releaseName: row.entityKind === "release" ? row.title : null,
      listenedAt: new Date(),
      listenType: "single",
      recordingMbid: row.entityKind === "track" ? row.mbid : null,
      releaseMbid: row.entityKind === "release" ? row.mbid : null,
    });
    if (!trackId) return null;
    if (row.entityKind === "track") return trackId;
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      select: { releaseId: true },
    });
    return track?.releaseId ?? null;
  }
}
