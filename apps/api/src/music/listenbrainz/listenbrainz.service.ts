import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CatalogService } from "../catalog/catalog.service";
import { EnrichmentService } from "../enrichment/enrichment.service";
import { PlayingNowService } from "../playing-now/playing-now.service";
import { UsersService } from "../users/users.service";
import { hashToken } from "../lib/tokens";
import { ListenItemSchema, SubmitListensSchema } from "./listenbrainz.schema";

const MAX_DURATION_MS = 2_147_483_647;

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function toDurationMs(info: Record<string, unknown>): number | null {
  const ms =
    typeof info.duration_ms === "number"
      ? info.duration_ms
      : typeof info.duration === "number"
        ? info.duration * 1000
        : null;
  return ms != null && ms >= 0 && ms <= MAX_DURATION_MS ? Math.round(ms) : null;
}

@Injectable()
export class ListenBrainzService {
  private readonly logger = new Logger(ListenBrainzService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly enrichment: EnrichmentService,
    private readonly playingNow: PlayingNowService,
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

  async submitListens(userId: string, body: unknown) {
    const parsed = SubmitListensSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 400,
        error: "Invalid request body",
      });
    }
    const listenType = (parsed.data.listen_type || "single").toLowerCase();
    const payload = Array.isArray(parsed.data.payload)
      ? (parsed.data.payload as unknown[])
      : [];
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
      await this.playingNow.submit(userId, meta);
      return { status: "ok" };
    }

    if (listenType !== "single" && listenType !== "import") {
      throw new BadRequestException({
        code: 400,
        error: `Unsupported listen_type: ${listenType}`,
      });
    }

    const metas = payload.map((item) => this.parseItem(item, listenType));
    const invalidIndex = metas.findIndex((meta) => !meta);
    if (invalidIndex !== -1) {
      throw new BadRequestException({
        code: 400,
        error: `Invalid listen at payload index ${invalidIndex}`,
      });
    }

    let accepted = 0;
    for (const meta of metas) {
      if (!meta) continue;
      const result = await this.catalog.upsertListen(userId, meta);
      void this.enrichment.enqueueTrack(result.track.id).catch((err: unknown) => {
        this.logger.warn(
          `Failed to enqueue enrichment for track ${result.track.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      });
      accepted += 1;
    }

    // Scrobble received — drop now-playing so the UI does not stick on the track.
    if (listenType === "single" && accepted > 0) {
      await this.playingNow.clear(userId);
    }

    return { status: "ok", accepted };
  }

  async getListens(
    username: string,
    opts: { maxTs?: number; minTs?: number; count?: number },
  ) {
    const user = await this.users.findByUsername(username);
    if (!user) return null;

    const requested =
      opts.count != null && Number.isFinite(opts.count)
        ? Math.trunc(opts.count)
        : 25;
    const count = Math.min(Math.max(requested, 1), 1000);
    const minTs =
      opts.minTs != null && Number.isFinite(opts.minTs) ? opts.minTs : undefined;
    const maxTs =
      opts.maxTs != null && Number.isFinite(opts.maxTs) ? opts.maxTs : undefined;

    // ListenBrainz allows both; only reject inverted ranges.
    // https://github.com/metabrainz/listenbrainz-server — max_ts must be > min_ts
    if (minTs != null && maxTs != null && maxTs <= minTs) {
      throw new BadRequestException({
        code: 400,
        error: "max_ts should be greater than min_ts",
      });
    }

    const listenedAt: { lt?: Date; gt?: Date } = {};
    if (maxTs != null) listenedAt.lt = new Date(maxTs * 1000);
    if (minTs != null) listenedAt.gt = new Date(minTs * 1000);

    const listens = await this.prisma.listen.findMany({
      where: {
        userId: user.id,
        ...(Object.keys(listenedAt).length ? { listenedAt } : {}),
      },
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

    const snapshot = await this.playingNow.getSnapshot(user.id);
    const listens = snapshot
      ? [
          {
            track_metadata: {
              artist_name: snapshot.track.artistName,
              track_name: snapshot.track.title,
              release_name: snapshot.track.releaseTitle ?? undefined,
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

  private parseItem(raw: unknown, listenType: string) {
    const parsed = ListenItemSchema.safeParse(raw);
    if (!parsed.success) return null;
    const item = parsed.data;
    const tm = item.track_metadata;

    const info = tm.additional_info || {};
    const listenedAt =
      listenType === "playing_now"
        ? new Date()
        : item.listened_at
          ? new Date(Number(item.listened_at) * 1000)
          : new Date();

    if (Number.isNaN(listenedAt.getTime())) return null;

    let spotifyId: string | null = null;
    if (typeof info.spotify_id === "string") {
      const m = /track\/([a-zA-Z0-9]+)/.exec(info.spotify_id);
      spotifyId = m?.[1] || info.spotify_id;
    }

    return {
      artistName: tm.artist_name,
      trackName: tm.track_name,
      releaseName: tm.release_name?.trim() || null,
      listenedAt,
      listenType,
      recordingMbid: stringOrNull(info.recording_mbid),
      trackMbid: stringOrNull(info.track_mbid),
      releaseMbid: stringOrNull(info.release_mbid),
      artistMbids: Array.isArray(info.artist_mbids)
        ? info.artist_mbids.filter((x): x is string => typeof x === "string")
        : [],
      isrc: typeof info.isrc === "string" ? info.isrc : null,
      spotifyId,
      durationMs: toDurationMs(info),
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
      rawPayload: JSON.stringify(raw),
    };
  }
}
