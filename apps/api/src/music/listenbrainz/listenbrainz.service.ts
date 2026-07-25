import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CatalogService } from "../catalog/catalog.service";
import { EnrichmentService } from "../enrichment/enrichment.service";
import { UsersService } from "../users/users.service";
import { hashToken } from "../lib/tokens";

type LbAdditionalInfo = {
  artist_mbids?: string[];
  release_mbid?: string;
  recording_mbid?: string;
  track_mbid?: string;
  isrc?: string;
  spotify_id?: string;
  duration_ms?: number;
  duration?: number;
  tags?: string[];
  media_player?: string;
  submission_client?: string;
  music_service?: string;
  [key: string]: unknown;
};

type LbTrackMetadata = {
  artist_name?: string;
  track_name?: string;
  release_name?: string;
  additional_info?: LbAdditionalInfo;
};

type LbPayloadItem = {
  listened_at?: number;
  track_metadata?: LbTrackMetadata;
};

type SubmitBody = {
  listen_type?: string;
  payload?: LbPayloadItem[];
};

@Injectable()
export class ListenBrainzService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly enrichment: EnrichmentService,
    private readonly users: UsersService,
  ) {}

  async validateToken(token: string | null) {
    if (!token) {
      return { code: 200, message: "Token missing.", valid: false };
    }
    const user = await this.users.findByTokenHash(hashToken(token));
    if (!user) {
      return { code: 200, message: "Token invalid.", valid: false };
    }
    return {
      code: 200,
      message: "Token valid.",
      valid: true,
      user_name: user.username,
    };
  }

  async submitListens(userId: string, body: SubmitBody) {
    const listenType = (body.listen_type || "single").toLowerCase();
    const payload = Array.isArray(body.payload) ? body.payload : [];
    if (!payload.length) {
      throw new BadRequestException({
        code: 400,
        error: "payload must be a non-empty array",
      });
    }
    if (payload.length > 1000) {
      throw new BadRequestException({
        code: 400,
        error: "Too many listens in payload",
      });
    }

    if (listenType === "playing_now") {
      const item = payload[0];
      const meta = this.parseItem(item, listenType);
      if (!meta) {
        throw new BadRequestException({
          code: 400,
          error: "Invalid playing_now payload",
        });
      }
      const result = await this.catalog.setPlayingNow(userId, meta);
      void this.enrichment.enqueueTrack(result.track.id);
      return { status: "ok" };
    }

    if (listenType !== "single" && listenType !== "import") {
      throw new BadRequestException({
        code: 400,
        error: `Unsupported listen_type: ${listenType}`,
      });
    }

    let accepted = 0;
    for (const item of payload) {
      const meta = this.parseItem(item, listenType);
      if (!meta) continue;
      const result = await this.catalog.upsertListen(userId, meta);
      void this.enrichment.enqueueTrack(result.track.id);
      accepted += 1;
    }

    return { status: "ok", accepted };
  }

  async getListens(
    username: string,
    opts: { maxTs?: number; minTs?: number; count?: number },
  ) {
    const user = await this.users.findByUsername(username);
    if (!user) return null;

    const count = Math.min(Math.max(opts.count ?? 25, 1), 1000);
    const where: {
      userId: string;
      listenedAt?: { lt?: Date; gt?: Date };
    } = { userId: user.id };

    if (opts.maxTs != null && opts.minTs != null) {
      throw new BadRequestException({
        code: 400,
        error: "Specify max_ts or min_ts, not both",
      });
    }
    if (opts.maxTs != null) {
      where.listenedAt = { lt: new Date(opts.maxTs * 1000) };
    } else if (opts.minTs != null) {
      where.listenedAt = { gt: new Date(opts.minTs * 1000) };
    }

    const listens = await this.prisma.listen.findMany({
      where,
      orderBy: { listenedAt: "desc" },
      take: count,
      include: {
        track: { include: { artist: true, release: true } },
      },
    });

    return {
      payload: {
        count: listens.length,
        latest_listen_ts: listens[0]
          ? Math.floor(listens[0].listenedAt.getTime() / 1000)
          : 0,
        listens: listens.map((l) => ({
          listened_at: Math.floor(l.listenedAt.getTime() / 1000),
          track_metadata: {
            artist_name: l.track.artist.name,
            track_name: l.track.title,
            release_name: l.track.release?.title,
            additional_info: {
              recording_mbid: l.track.recordingMbid ?? undefined,
              release_mbid: l.track.release?.mbid ?? undefined,
              spotify_id: l.track.spotifyId ?? undefined,
              duration_ms: l.track.durationMs ?? undefined,
              media_player: l.mediaPlayer ?? undefined,
              submission_client: l.submissionClient ?? undefined,
              music_service: l.musicService ?? undefined,
            },
          },
        })),
        user_id:
          (await this.users.getListenbrainzUsername(user.id)) ||
          user.personaName,
      },
    };
  }

  async getListenCount(username: string) {
    const user = await this.users.findByUsername(username);
    if (!user) return null;
    const count = await this.prisma.listen.count({ where: { userId: user.id } });
    return { payload: { count } };
  }

  async getPlayingNow(username: string) {
    const user = await this.users.findByUsername(username);
    if (!user) return null;

    const row = await this.prisma.playingNow.findUnique({
      where: { userId: user.id },
      include: { track: { include: { artist: true, release: true } } },
    });

    const listens = row
      ? [
          {
            track_metadata: {
              artist_name: row.track.artist.name,
              track_name: row.track.title,
              release_name: row.track.release?.title,
            },
          },
        ]
      : [];

    return {
      payload: {
        count: listens.length,
        listens,
        user_id:
          (await this.users.getListenbrainzUsername(user.id)) ||
          user.personaName,
      },
    };
  }

  private parseItem(item: LbPayloadItem, listenType: string) {
    const tm = item.track_metadata;
    if (!tm?.artist_name?.trim() || !tm?.track_name?.trim()) return null;

    const info = tm.additional_info || {};
    const listenedAt =
      listenType === "playing_now"
        ? new Date()
        : item.listened_at
          ? new Date(item.listened_at * 1000)
          : new Date();

    if (Number.isNaN(listenedAt.getTime())) return null;

    let spotifyId: string | null = null;
    if (typeof info.spotify_id === "string") {
      const m = /track\/([a-zA-Z0-9]+)/.exec(info.spotify_id);
      spotifyId = m?.[1] || info.spotify_id;
    }

    const durationMs =
      typeof info.duration_ms === "number"
        ? info.duration_ms
        : typeof info.duration === "number"
          ? info.duration * 1000
          : null;

    return {
      artistName: tm.artist_name.trim(),
      trackName: tm.track_name.trim(),
      releaseName: tm.release_name?.trim() || null,
      listenedAt,
      listenType,
      recordingMbid: info.recording_mbid || null,
      trackMbid: info.track_mbid || null,
      releaseMbid: info.release_mbid || null,
      artistMbids: Array.isArray(info.artist_mbids)
        ? info.artist_mbids.filter((x): x is string => typeof x === "string")
        : [],
      isrc: typeof info.isrc === "string" ? info.isrc : null,
      spotifyId,
      durationMs,
      tags: Array.isArray(info.tags)
        ? info.tags.filter((x): x is string => typeof x === "string")
        : [],
      mediaPlayer:
        typeof info.media_player === "string" ? info.media_player : null,
      submissionClient:
        typeof info.submission_client === "string"
          ? info.submission_client
          : null,
      musicService:
        typeof info.music_service === "string" ? info.music_service : null,
      rawPayload: JSON.stringify(item),
    };
  }
}
