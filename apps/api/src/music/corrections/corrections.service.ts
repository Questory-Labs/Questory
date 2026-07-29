import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { MusicEntityRef } from "@questorylabs/shared";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CatalogService,
  type IncomingListenMeta,
} from "../catalog/catalog.service";
import { normalizeName, primaryArtistNorm } from "../lib/tokens";

type RuleKind = "track" | "album" | "artist";

type LoadedRule = {
  id: string;
  kind: RuleKind;
  matchArtistNorm: string;
  matchAlbumNorm: string | null;
  matchTrackNorm: string | null;
  sourceTrackId: string | null;
  sourceReleaseId: string | null;
  sourceArtistId: string | null;
  targetTrackTitle: string | null;
  targetTrackId: string | null;
  targetAlbumTitle: string | null;
  targetAlbumId: string | null;
  artists: Array<{ id: string; name: string; position: number }>;
};

@Injectable()
export class CorrectionsService {
  private rulesCache = new Map<
    string,
    { loadedAt: number; rules: LoadedRule[] }
  >();
  private static CACHE_TTL_MS = 30_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
  ) {}

  async applyRulesToMeta(
    userId: string,
    meta: IncomingListenMeta,
  ): Promise<IncomingListenMeta> {
    const rules = await this.loadUserRules(userId);
    if (rules.length === 0) return meta;

    const artistNorm = primaryArtistNorm(meta.artistName);
    const albumNorm = meta.releaseName
      ? normalizeName(meta.releaseName)
      : null;
    const trackNorm = normalizeName(meta.trackName);

    let rule =
      (await this.findRuleByIncomingSourceTrack(rules, meta)) ??
      this.findBestRule(rules, artistNorm, albumNorm, trackNorm) ??
      (await this.findRuleBySourceReleaseAndArtist(rules, meta));

    if (!rule || rule.artists.length === 0) return meta;

    const primary = rule.artists[0];
    const featured = rule.artists.slice(1);
    const artistName =
      featured.length > 0
        ? `${primary.name} feat. ${featured.map((a) => a.name).join(", ")}`
        : primary.name;

    const next: IncomingListenMeta = {
      ...meta,
      artistName,
      artistMbids: [],
      correctionArtistIds: rule.artists.map((a) => a.id),
      correctionTargetTrackId: rule.targetTrackId ?? undefined,
      correctionTargetAlbumId: rule.targetAlbumId ?? undefined,
      recordingMbid: null,
      trackMbid: null,
      releaseMbid: null,
      spotifyId: null,
      isrc: null,
    };

    if (rule.kind === "track" && rule.targetTrackTitle) {
      next.trackName = rule.targetTrackTitle;
    }
    if (
      (rule.kind === "track" || rule.kind === "album") &&
      rule.targetAlbumTitle
    ) {
      next.releaseName = rule.targetAlbumTitle;
    }
    if (rule.kind === "artist") {
      next.trackName = meta.trackName;
      next.releaseName = meta.releaseName;
    }

    return next;
  }

  getCorrectionArtistIds(meta: IncomingListenMeta): string[] | undefined {
    return meta.correctionArtistIds;
  }

  /** If a merge/correction rule routes this catalog track elsewhere, return the target id. */
  async resolvePlaybackTrackId(
    userId: string,
    trackId: string,
  ): Promise<string> {
    const rules = await this.loadUserRules(userId);
    for (const rule of rules) {
      if (rule.kind !== "track" || rule.sourceTrackId !== trackId) continue;
      if (rule.targetTrackId) return rule.targetTrackId;

      if (!rule.targetTrackTitle || rule.artists.length === 0) continue;

      const resolved = await this.catalog.resolveCorrectedTrack({
        artistIds: rule.artists.map((a) => a.id),
        trackTitle: rule.targetTrackTitle,
        albumTitle: rule.targetAlbumTitle,
        albumId: rule.targetAlbumId,
      });
      if (resolved.id === trackId) continue;

      rule.targetTrackId = resolved.id;
      if (!rule.targetAlbumId) {
        rule.targetAlbumId = resolved.releaseId;
      }
      void this.prisma.userMusicRule
        .update({
          where: { id: rule.id },
          data: {
            targetTrackId: resolved.id,
            targetAlbumId: rule.targetAlbumId,
          },
        })
        .catch(() => undefined);

      return resolved.id;
    }
    return trackId;
  }

  async suggest(
    userId: string,
    kind: "artist" | "album" | "track",
    query: string,
    limit = 10,
  ) {
    const q = query.trim();
    const take = Math.min(Math.max(limit, 1), 25);
    const qNorm = q ? normalizeName(q) : "";

    if (kind === "artist") {
      const listens = await this.prisma.listen.findMany({
        where: { userId },
        distinct: ["trackId"],
        select: {
          track: {
            select: {
              artist: { select: { id: true, name: true, nameNormalized: true } },
              featuredArtists: {
                select: {
                  artist: {
                    select: { id: true, name: true, nameNormalized: true },
                  },
                },
              },
            },
          },
        },
        take: 500,
      });
      const seen = new Map<string, { id: string; name: string }>();
      for (const l of listens) {
        const primary = l.track.artist;
        if (!qNorm || primary.nameNormalized.includes(qNorm)) {
          seen.set(primary.id, { id: primary.id, name: primary.name });
        }
        for (const fa of l.track.featuredArtists) {
          const a = fa.artist;
          if (!qNorm || a.nameNormalized.includes(qNorm)) {
            seen.set(a.id, { id: a.id, name: a.name });
          }
        }
      }
      const items: Array<{ id?: string; name: string; isNew?: boolean }> = [
        ...[...seen.values()]
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(0, take)
          .map((a) => ({ id: a.id, name: a.name })),
      ];
      if (q && !items.some((i) => normalizeName(i.name) === qNorm)) {
        items.unshift({ name: q, isNew: true });
      }
      return { items };
    }

    if (kind === "album") {
      const listens = await this.prisma.listen.findMany({
        where: {
          userId,
          track: {
            releaseId: { not: null },
            ...(qNorm
              ? { release: { titleNormalized: { contains: qNorm } } }
              : {}),
          },
        },
        distinct: ["trackId"],
        select: {
          track: {
            select: {
              release: {
                select: { id: true, title: true, titleNormalized: true },
              },
            },
          },
        },
        take: 500,
      });
      const seen = new Map<string, { id: string; name: string }>();
      for (const l of listens) {
        const r = l.track.release;
        if (!r) continue;
        seen.set(r.id, { id: r.id, name: r.title });
      }
      const items: Array<{ id?: string; name: string; isNew?: boolean }> = [
        ...[...seen.values()]
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(0, take)
          .map((a) => ({ id: a.id, name: a.name })),
      ];
      if (q && !items.some((i) => normalizeName(i.name) === qNorm)) {
        items.unshift({ name: q, isNew: true });
      }
      return { items };
    }

    const listens = await this.prisma.listen.findMany({
      where: {
        userId,
        ...(qNorm
          ? { track: { titleNormalized: { contains: qNorm } } }
          : {}),
      },
      distinct: ["trackId"],
      select: {
        track: { select: { id: true, title: true, titleNormalized: true } },
      },
      take: 500,
    });
    const seen = new Map<string, { id: string; name: string }>();
    for (const l of listens) {
      const t = l.track;
      seen.set(t.id, { id: t.id, name: t.title });
    }
    const items: Array<{ id?: string; name: string; isNew?: boolean }> = [
      ...[...seen.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, take)
        .map((a) => ({ id: a.id, name: a.name })),
    ];
    if (q && !items.some((i) => normalizeName(i.name) === qNorm)) {
      items.unshift({ name: q, isNew: true });
    }
    return { items };
  }

  async getTrackCorrectionForm(userId: string, trackId: string) {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      include: {
        artist: true,
        release: true,
        featuredArtists: {
          include: { artist: true },
          orderBy: { position: "asc" },
        },
      },
    });
    if (!track) throw new NotFoundException("Track not found");

    const rule = await this.prisma.userMusicRule.findFirst({
      where: { userId, sourceTrackId: trackId, kind: "track" },
      include: {
        targetArtists: {
          include: { artist: true },
          orderBy: { position: "asc" },
        },
      },
    });

    const label = await this.prisma.userMusicLabel.findUnique({
      where: {
        userId_entityKind_entityId: {
          userId,
          entityKind: "track",
          entityId: trackId,
        },
      },
    });

    const artists = rule
      ? rule.targetArtists.map((ta) => ({
          id: ta.artist.id,
          name: ta.artist.name,
        }))
      : [
          { id: track.artist.id, name: track.artist.name },
          ...track.featuredArtists.map((fa) => ({
            id: fa.artist.id,
            name: fa.artist.name,
          })),
        ];

    const sourceListenCount = await this.prisma.listen.count({
      where: { userId, trackId },
    });

    return {
      kind: "track" as const,
      original: {
        title: track.title,
        artistName: track.artist.name,
        albumTitle: track.release?.title ?? null,
      },
      current: {
        title: rule?.targetTrackTitle ?? track.title,
        displayName: label?.displayName ?? null,
        artists,
        albumTitle:
          rule?.targetAlbumTitle ?? track.release?.title ?? null,
        albumId: rule?.targetAlbumId ?? track.releaseId,
      },
      hasRule: Boolean(rule),
      sourceListenCount,
    };
  }

  async getAlbumCorrectionForm(userId: string, releaseId: string) {
    const release = await this.prisma.release.findUnique({
      where: { id: releaseId },
      include: { artist: true },
    });
    if (!release) throw new NotFoundException("Album not found");

    const rule = await this.prisma.userMusicRule.findFirst({
      where: { userId, sourceReleaseId: releaseId, kind: "album" },
      include: {
        targetArtists: {
          include: { artist: true },
          orderBy: { position: "asc" },
        },
      },
    });

    const label = await this.prisma.userMusicLabel.findUnique({
      where: {
        userId_entityKind_entityId: {
          userId,
          entityKind: "release",
          entityId: releaseId,
        },
      },
    });

    const artists = rule?.targetArtists.length
      ? rule.targetArtists.map((ta) => ({
          id: ta.artist.id,
          name: ta.artist.name,
        }))
      : release.artist
        ? [{ id: release.artist.id, name: release.artist.name }]
        : [];

    return {
      kind: "album" as const,
      original: {
        title: release.title,
        artistName: release.artist?.name,
        albumTitle: release.title,
      },
      current: {
        title: rule?.targetAlbumTitle ?? release.title,
        displayName: label?.displayName ?? null,
        artists,
        albumTitle: rule?.targetAlbumTitle ?? release.title,
        albumId: releaseId,
      },
      hasRule: Boolean(rule),
    };
  }

  async getArtistCorrectionForm(userId: string, artistId: string) {
    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId },
    });
    if (!artist) throw new NotFoundException("Artist not found");

    const rule = await this.prisma.userMusicRule.findFirst({
      where: { userId, sourceArtistId: artistId, kind: "artist" },
      include: {
        targetArtists: {
          include: { artist: true },
          orderBy: { position: "asc" },
        },
      },
    });

    const label = await this.prisma.userMusicLabel.findUnique({
      where: {
        userId_entityKind_entityId: {
          userId,
          entityKind: "artist",
          entityId: artistId,
        },
      },
    });

    const targetArtist = rule?.targetArtists[0]?.artist;

    return {
      kind: "artist" as const,
      original: {
        artistName: artist.name,
      },
      current: {
        displayName: label?.displayName ?? null,
        artists: targetArtist
          ? [{ id: targetArtist.id, name: targetArtist.name }]
          : [{ id: artist.id, name: artist.name }],
      },
      hasRule: Boolean(rule),
    };
  }

  async mergeTrackInto(
    userId: string,
    sourceTrackId: string,
    targetTrackId: string,
  ) {
    if (sourceTrackId === targetTrackId) {
      throw new BadRequestException("Cannot merge a track into itself");
    }

    const source = await this.prisma.track.findUnique({
      where: { id: sourceTrackId },
      include: {
        artist: true,
        release: true,
        featuredArtists: {
          include: { artist: true },
          orderBy: { position: "asc" },
        },
      },
    });
    if (!source) throw new NotFoundException("Track not found");

    const target = await this.prisma.track.findUnique({
      where: { id: targetTrackId },
      include: {
        artist: true,
        release: true,
        featuredArtists: {
          orderBy: { position: "asc" },
        },
      },
    });
    if (!target) throw new NotFoundException("Target track not found");

    const targetArtistIds = [
      target.artistId,
      ...target.featuredArtists.map((fa) => fa.artistId),
    ];

    await this.prisma.userMusicLabel.deleteMany({
      where: {
        userId,
        entityKind: "track",
        entityId: sourceTrackId,
      },
    });

    await this.upsertTrackRule(userId, sourceTrackId, {
      matchArtistNorm: source.artist.nameNormalized,
      matchAlbumNorm: source.release?.titleNormalized ?? null,
      matchTrackNorm: source.titleNormalized,
      targetTrackTitle: target.title,
      targetTrackId: targetTrackId,
      targetAlbumTitle: target.release?.title ?? null,
      targetAlbumId: target.releaseId,
      artistIds: targetArtistIds,
    });

    const mergedListenCount = await this.moveUserListensBetweenTracks(
      userId,
      sourceTrackId,
      targetTrackId,
    );

    await this.prisma.playingNow.updateMany({
      where: { userId, trackId: sourceTrackId },
      data: { trackId: targetTrackId, updatedAt: new Date() },
    });

    this.invalidateRulesCache(userId);

    return { ok: true as const, trackId: targetTrackId, mergedListenCount };
  }

  async saveTrackCorrection(
    userId: string,
    trackId: string,
    input: {
      trackTitle?: string;
      albumTitle?: string | null;
      artists?: MusicEntityRef[];
      displayName?: string | null;
    },
  ) {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      include: {
        artist: true,
        release: true,
        featuredArtists: { include: { artist: true } },
      },
    });
    if (!track) throw new NotFoundException("Track not found");

    const existingRule = await this.prisma.userMusicRule.findFirst({
      where: { userId, sourceTrackId: trackId, kind: "track" },
      include: {
        targetArtists: {
          include: { artist: true },
          orderBy: { position: "asc" },
        },
      },
    });

    const currentArtists = existingRule?.targetArtists.length
      ? existingRule.targetArtists.map((ta) => ({
          id: ta.artist.id,
          name: ta.artist.name,
        }))
      : [
          { id: track.artist.id, name: track.artist.name },
          ...track.featuredArtists.map((fa) => ({
            id: fa.artist.id,
            name: fa.artist.name,
          })),
        ];
    const currentTrackTitle = existingRule?.targetTrackTitle ?? track.title;
    const currentAlbumTitle =
      existingRule?.targetAlbumTitle ?? track.release?.title ?? null;

    const hasChanges =
      Boolean(input.trackTitle?.trim()) ||
      Boolean(input.artists?.length) ||
      Boolean(input.albumTitle?.trim()) ||
      input.displayName !== undefined;
    if (!hasChanges) {
      return { ok: true, reassigned: false };
    }

    const artists = input.artists?.length ? input.artists : currentArtists;
    const trackTitle = input.trackTitle?.trim() || currentTrackTitle;
    const albumTitle = input.albumTitle?.trim()
      ? input.albumTitle.trim()
      : currentAlbumTitle;

    const resolvedArtists = await this.resolveArtistRefs(artists);
    const primaryId = resolvedArtists[0].id;
    const featuredIds = resolvedArtists.slice(1).map((a) => a.id);

    const samePrimary = primaryId === track.artistId;
    const sameFeatured =
      featuredIds.length === track.featuredArtists.length &&
      featuredIds.every(
        (id, i) => track.featuredArtists[i]?.artistId === id,
      );
    const sameAlbum =
      (albumTitle == null && !track.releaseId) ||
      (albumTitle != null &&
        track.release &&
        normalizeName(albumTitle) === track.release.titleNormalized);
    const sameTitle =
      normalizeName(trackTitle) === track.titleNormalized;

    const reassignmentNeeded =
      !samePrimary || !sameFeatured || !sameAlbum || !sameTitle;

    if (!reassignmentNeeded) {
      if (input.displayName !== undefined) {
        await this.upsertLabel(
          userId,
          "track",
          trackId,
          input.displayName ?? null,
        );
      }
      await this.prisma.userMusicRule.deleteMany({
        where: { userId, sourceTrackId: trackId, kind: "track" },
      });
      this.invalidateRulesCache(userId);
      return { ok: true, reassigned: false };
    }

    await this.prisma.userMusicLabel.deleteMany({
      where: {
        userId,
        entityKind: "track",
        entityId: trackId,
      },
    });

    const matchArtistNorm = track.artist.nameNormalized;
    const matchAlbumNorm = track.release
      ? track.release.titleNormalized
      : null;
    const matchTrackNorm = track.titleNormalized;

    const rule = await this.upsertTrackRule(userId, trackId, {
      matchArtistNorm,
      matchAlbumNorm,
      matchTrackNorm,
      targetTrackTitle: trackTitle,
      targetAlbumTitle: albumTitle,
      artistIds: resolvedArtists.map((a) => a.id),
    });

    const targetTrack = await this.catalog.resolveCorrectedTrack({
      artistIds: resolvedArtists.map((a) => a.id),
      trackTitle,
      albumTitle,
      albumId: null,
    });

    await this.prisma.userMusicRule.update({
      where: { id: rule.id },
      data: {
        targetTrackId: targetTrack.id,
        targetAlbumId: targetTrack.releaseId,
      },
    });

    await this.backfillForRule(userId, rule, targetTrack.id);
    this.invalidateRulesCache(userId);

    return { ok: true, reassigned: true, trackId: targetTrack.id };
  }

  async saveAlbumCorrection(
    userId: string,
    releaseId: string,
    input: {
      albumTitle?: string | null;
      artists?: MusicEntityRef[];
      displayName?: string | null;
    },
  ) {
    const release = await this.prisma.release.findUnique({
      where: { id: releaseId },
      include: { artist: true },
    });
    if (!release) throw new NotFoundException("Album not found");

    const existingRule = await this.prisma.userMusicRule.findFirst({
      where: { userId, sourceReleaseId: releaseId, kind: "album" },
      include: {
        targetArtists: {
          include: { artist: true },
          orderBy: { position: "asc" },
        },
      },
    });

    const currentArtists = existingRule?.targetArtists.length
      ? existingRule.targetArtists.map((ta) => ({
          id: ta.artist.id,
          name: ta.artist.name,
        }))
      : release.artist
        ? [{ id: release.artist.id, name: release.artist.name }]
        : [];
    const currentAlbumTitle = existingRule?.targetAlbumTitle ?? release.title;

    const hasChanges =
      Boolean(input.albumTitle?.trim()) ||
      Boolean(input.artists?.length) ||
      input.displayName !== undefined;
    if (!hasChanges) {
      return { ok: true, reassigned: false };
    }

    const artists = input.artists?.length ? input.artists : currentArtists;
    if (!artists.length) {
      throw new BadRequestException("At least one artist is required");
    }

    const albumTitle = input.albumTitle?.trim() || currentAlbumTitle;
    const resolvedArtists = await this.resolveArtistRefs(artists);
    const primaryId = resolvedArtists[0].id;

    const samePrimary = release.artistId === primaryId;
    const sameTitle =
      normalizeName(albumTitle) === release.titleNormalized;

    if (samePrimary && sameTitle) {
      if (input.displayName !== undefined) {
        await this.upsertLabel(
          userId,
          "release",
          releaseId,
          input.displayName ?? null,
        );
      }
      await this.prisma.userMusicRule.deleteMany({
        where: { userId, sourceReleaseId: releaseId, kind: "album" },
      });
      this.invalidateRulesCache(userId);
      return { ok: true, reassigned: false };
    }

    await this.prisma.userMusicLabel.deleteMany({
      where: {
        userId,
        entityKind: "release",
        entityId: releaseId,
      },
    });

    const rule = await this.upsertAlbumRule(userId, releaseId, {
      matchArtistNorm: release.artist?.nameNormalized ?? "",
      matchAlbumNorm: release.titleNormalized,
      targetAlbumTitle: albumTitle,
      artistIds: resolvedArtists.map((a) => a.id),
    });

    const targetRelease = await this.catalog.resolveCorrectedRelease({
      artistId: primaryId,
      albumTitle,
    });
    await this.prisma.userMusicRule.update({
      where: { id: rule.id },
      data: { targetAlbumId: targetRelease.id },
    });

    await this.backfillAlbumForRule(userId, rule, releaseId);
    this.invalidateRulesCache(userId);

    return { ok: true, reassigned: true };
  }

  async saveArtistCorrection(
    userId: string,
    artistId: string,
    input: {
      artists?: MusicEntityRef[];
      displayName?: string | null;
    },
  ) {
    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId },
    });
    if (!artist) throw new NotFoundException("Artist not found");

    const existingRule = await this.prisma.userMusicRule.findFirst({
      where: { userId, sourceArtistId: artistId, kind: "artist" },
      include: {
        targetArtists: {
          include: { artist: true },
          orderBy: { position: "asc" },
        },
      },
    });

    const currentTarget = existingRule?.targetArtists[0]?.artist ?? artist;
    const hasChanges =
      Boolean(input.artists?.length) || input.displayName !== undefined;
    if (!hasChanges) {
      return { ok: true, reassigned: false };
    }

    const targetRef = input.artists?.[0] ?? {
      id: currentTarget.id,
      name: currentTarget.name,
    };

    const resolved = await this.resolveArtistRefs([targetRef]);
    const targetId = resolved[0].id;

    if (targetId === artistId) {
      if (input.displayName !== undefined) {
        await this.upsertLabel(
          userId,
          "artist",
          artistId,
          input.displayName ?? null,
        );
      }
      await this.prisma.userMusicRule.deleteMany({
        where: { userId, sourceArtistId: artistId, kind: "artist" },
      });
      this.invalidateRulesCache(userId);
      return { ok: true, reassigned: false };
    }

    await this.prisma.userMusicLabel.deleteMany({
      where: {
        userId,
        entityKind: "artist",
        entityId: artistId,
      },
    });

    const rule = await this.upsertArtistRule(userId, artistId, {
      matchArtistNorm: artist.nameNormalized,
      targetArtistIds: [targetId],
    });

    await this.backfillArtistForRule(userId, rule, artistId);
    this.invalidateRulesCache(userId);

    return { ok: true, reassigned: true };
  }

  async deleteRule(userId: string, ruleId: string) {
    const rule = await this.prisma.userMusicRule.findFirst({
      where: { id: ruleId, userId },
    });
    if (!rule) throw new NotFoundException("Rule not found");
    await this.prisma.userMusicRule.delete({ where: { id: ruleId } });
    this.invalidateRulesCache(userId);
    return { ok: true };
  }

  async resolveDisplayName(
    userId: string,
    entityKind: "artist" | "release" | "track",
    entityId: string,
    canonical: string,
  ): Promise<string> {
    const label = await this.prisma.userMusicLabel.findUnique({
      where: {
        userId_entityKind_entityId: { userId, entityKind, entityId },
      },
    });
    return label?.displayName?.trim() || canonical;
  }

  async loadLabelsForUser(
    userId: string,
    entityKind: "artist" | "release" | "track",
    entityIds: string[],
  ): Promise<Map<string, string>> {
    if (entityIds.length === 0) return new Map();
    const labels = await this.prisma.userMusicLabel.findMany({
      where: { userId, entityKind, entityId: { in: entityIds } },
    });
    const map = new Map<string, string>();
    for (const l of labels) {
      if (l.displayName.trim()) map.set(l.entityId, l.displayName.trim());
    }
    return map;
  }

  private async resolveArtistRefs(refs: MusicEntityRef[]) {
    const out: Array<{ id: string; name: string }> = [];
    for (const ref of refs) {
      if (ref.id) {
        const artist = await this.prisma.artist.findUnique({
          where: { id: ref.id },
        });
        if (artist) {
          out.push({ id: artist.id, name: artist.name });
          continue;
        }
      }
      const created = await this.catalog.upsertArtistPublic(ref.name, null);
      out.push({ id: created.id, name: created.name });
    }
    return out;
  }

  private async upsertTrackRule(
    userId: string,
    sourceTrackId: string,
    data: {
      matchArtistNorm: string;
      matchAlbumNorm: string | null;
      matchTrackNorm: string;
      targetTrackTitle: string;
      targetTrackId?: string | null;
      targetAlbumTitle: string | null;
      targetAlbumId?: string | null;
      artistIds: string[];
    },
  ) {
    const existing = await this.prisma.userMusicRule.findFirst({
      where: { userId, sourceTrackId, kind: "track" },
    });

    const rule = existing
      ? await this.prisma.userMusicRule.update({
          where: { id: existing.id },
          data: {
            matchArtistNorm: data.matchArtistNorm,
            matchAlbumNorm: data.matchAlbumNorm,
            matchTrackNorm: data.matchTrackNorm,
            targetTrackTitle: data.targetTrackTitle,
            targetTrackId: data.targetTrackId ?? null,
            targetAlbumTitle: data.targetAlbumTitle,
            targetAlbumId: data.targetAlbumId ?? null,
          },
        })
      : await this.prisma.userMusicRule.create({
          data: {
            userId,
            kind: "track",
            sourceTrackId,
            matchArtistNorm: data.matchArtistNorm,
            matchAlbumNorm: data.matchAlbumNorm,
            matchTrackNorm: data.matchTrackNorm,
            targetTrackTitle: data.targetTrackTitle,
            targetTrackId: data.targetTrackId ?? null,
            targetAlbumTitle: data.targetAlbumTitle,
            targetAlbumId: data.targetAlbumId ?? null,
          },
        });

    await this.syncRuleArtists(rule.id, data.artistIds);
    return rule;
  }

  private async upsertAlbumRule(
    userId: string,
    sourceReleaseId: string,
    data: {
      matchArtistNorm: string;
      matchAlbumNorm: string;
      targetAlbumTitle: string;
      artistIds: string[];
    },
  ) {
    const existing = await this.prisma.userMusicRule.findFirst({
      where: { userId, sourceReleaseId, kind: "album" },
    });

    const rule = existing
      ? await this.prisma.userMusicRule.update({
          where: { id: existing.id },
          data: {
            matchArtistNorm: data.matchArtistNorm,
            matchAlbumNorm: data.matchAlbumNorm,
            targetAlbumTitle: data.targetAlbumTitle,
          },
        })
      : await this.prisma.userMusicRule.create({
          data: {
            userId,
            kind: "album",
            sourceReleaseId,
            matchArtistNorm: data.matchArtistNorm,
            matchAlbumNorm: data.matchAlbumNorm,
            targetTrackTitle: null,
            targetAlbumTitle: data.targetAlbumTitle,
          },
        });

    await this.syncRuleArtists(rule.id, data.artistIds);
    return rule;
  }

  private async upsertArtistRule(
    userId: string,
    sourceArtistId: string,
    data: {
      matchArtistNorm: string;
      targetArtistIds: string[];
    },
  ) {
    const existing = await this.prisma.userMusicRule.findFirst({
      where: { userId, sourceArtistId, kind: "artist" },
    });

    const rule = existing
      ? await this.prisma.userMusicRule.update({
          where: { id: existing.id },
          data: { matchArtistNorm: data.matchArtistNorm },
        })
      : await this.prisma.userMusicRule.create({
          data: {
            userId,
            kind: "artist",
            sourceArtistId,
            matchArtistNorm: data.matchArtistNorm,
          },
        });

    await this.syncRuleArtists(rule.id, data.targetArtistIds);
    return rule;
  }

  private async syncRuleArtists(ruleId: string, artistIds: string[]) {
    await this.prisma.userMusicRuleArtist.deleteMany({ where: { ruleId } });
    for (let i = 0; i < artistIds.length; i++) {
      await this.prisma.userMusicRuleArtist.create({
        data: { ruleId, artistId: artistIds[i], position: i },
      });
    }
  }

  private async upsertLabel(
    userId: string,
    entityKind: "artist" | "release" | "track",
    entityId: string,
    displayName: string | null,
  ) {
    const trimmed = displayName?.trim() || null;
    if (!trimmed) {
      await this.prisma.userMusicLabel.deleteMany({
        where: { userId, entityKind, entityId },
      });
      return;
    }
    await this.prisma.userMusicLabel.upsert({
      where: {
        userId_entityKind_entityId: { userId, entityKind, entityId },
      },
      create: { userId, entityKind, entityId, displayName: trimmed },
      update: { displayName: trimmed },
    });
  }

  private async moveUserListensBetweenTracks(
    userId: string,
    sourceTrackId: string,
    targetTrackId: string,
  ) {
    const listens = await this.prisma.listen.findMany({
      where: { userId, trackId: sourceTrackId },
      select: { id: true, listenedAt: true },
    });

    let moved = 0;
    for (const listen of listens) {
      const conflict = await this.prisma.listen.findUnique({
        where: {
          userId_trackId_listenedAt: {
            userId,
            trackId: targetTrackId,
            listenedAt: listen.listenedAt,
          },
        },
      });

      if (conflict) {
        await this.prisma.listen.delete({ where: { id: listen.id } });
      } else {
        await this.prisma.listen.update({
          where: { id: listen.id },
          data: { trackId: targetTrackId },
        });
        moved += 1;
      }
    }

    return moved;
  }

  async backfillForRule(
    userId: string,
    rule: { id: string; kind: string },
    targetTrackId: string,
  ) {
    const fullRule = await this.prisma.userMusicRule.findUnique({
      where: { id: rule.id },
    });
    if (!fullRule || fullRule.kind !== "track") return;

    const listens = await this.prisma.listen.findMany({
      where: {
        userId,
        track: {
          artist: { nameNormalized: fullRule.matchArtistNorm },
          titleNormalized: fullRule.matchTrackNorm ?? undefined,
          ...(fullRule.matchAlbumNorm
            ? { release: { titleNormalized: fullRule.matchAlbumNorm } }
            : {}),
        },
      },
      select: { id: true, listenedAt: true, trackId: true },
    });

    for (const listen of listens) {
      if (listen.trackId === targetTrackId) continue;

      const conflict = await this.prisma.listen.findUnique({
        where: {
          userId_trackId_listenedAt: {
            userId,
            trackId: targetTrackId,
            listenedAt: listen.listenedAt,
          },
        },
      });

      if (conflict) {
        await this.prisma.listen.delete({ where: { id: listen.id } });
      } else {
        await this.prisma.listen.update({
          where: { id: listen.id },
          data: { trackId: targetTrackId },
        });
      }
    }
  }

  private async backfillAlbumForRule(
    userId: string,
    rule: { id: string },
    sourceReleaseId: string,
  ) {
    const fullRule = await this.prisma.userMusicRule.findUnique({
      where: { id: rule.id },
      include: {
        targetArtists: { orderBy: { position: "asc" } },
      },
    });
    if (!fullRule) return;

    const artistIds = fullRule.targetArtists.map((a) => a.artistId);
    const listens = await this.prisma.listen.findMany({
      where: { userId, track: { releaseId: sourceReleaseId } },
      include: {
        track: {
          select: {
            id: true,
            title: true,
            titleNormalized: true,
            durationMs: true,
            recordingMbid: true,
            trackMbid: true,
            isrc: true,
            spotifyId: true,
          },
        },
      },
    });

    for (const listen of listens) {
      const t = listen.track;
      const targetTrack = await this.catalog.resolveCorrectedTrack({
        artistIds,
        trackTitle: t.title,
        albumTitle: fullRule.targetAlbumTitle,
        albumId: null,
      });
      if (targetTrack.id === t.id) continue;

      const conflict = await this.prisma.listen.findUnique({
        where: {
          userId_trackId_listenedAt: {
            userId,
            trackId: targetTrack.id,
            listenedAt: listen.listenedAt,
          },
        },
      });
      if (conflict) {
        await this.prisma.listen.delete({ where: { id: listen.id } });
      } else {
        await this.prisma.listen.update({
          where: { id: listen.id },
          data: { trackId: targetTrack.id },
        });
      }
    }
  }

  private async backfillArtistForRule(
    userId: string,
    rule: { id: string },
    sourceArtistId: string,
  ) {
    const fullRule = await this.prisma.userMusicRule.findUnique({
      where: { id: rule.id },
      include: {
        targetArtists: { orderBy: { position: "asc" } },
      },
    });
    if (!fullRule) return;

    const targetArtistId = fullRule.targetArtists[0]?.artistId;
    if (!targetArtistId) return;

    const listens = await this.prisma.listen.findMany({
      where: { userId, track: { artistId: sourceArtistId } },
      include: {
        track: {
          select: {
            id: true,
            title: true,
            releaseId: true,
            release: { select: { title: true } },
            durationMs: true,
            recordingMbid: true,
            trackMbid: true,
            isrc: true,
            spotifyId: true,
            featuredArtists: { select: { artistId: true, position: true } },
          },
        },
      },
    });

    for (const listen of listens) {
      const t = listen.track;
      const artistIds = [
        targetArtistId,
        ...t.featuredArtists
          .filter((fa) => fa.artistId !== sourceArtistId)
          .sort((a, b) => a.position - b.position)
          .map((fa) => fa.artistId),
      ];
      const targetTrack = await this.catalog.resolveCorrectedTrack({
        artistIds,
        trackTitle: t.title,
        albumTitle: t.release?.title ?? null,
        albumId: t.releaseId,
      });
      if (targetTrack.id === t.id) continue;

      const conflict = await this.prisma.listen.findUnique({
        where: {
          userId_trackId_listenedAt: {
            userId,
            trackId: targetTrack.id,
            listenedAt: listen.listenedAt,
          },
        },
      });
      if (conflict) {
        await this.prisma.listen.delete({ where: { id: listen.id } });
      } else {
        await this.prisma.listen.update({
          where: { id: listen.id },
          data: { trackId: targetTrack.id },
        });
      }
    }
  }

  private async findRuleByIncomingSourceTrack(
    rules: LoadedRule[],
    meta: IncomingListenMeta,
  ): Promise<LoadedRule | null> {
    const trackRules = rules.filter((r) => r.kind === "track" && r.sourceTrackId);
    if (trackRules.length === 0) return null;

    const trackId = await this.catalog.peekIncomingTrackId(meta);
    if (!trackId) return null;

    return trackRules.find((r) => r.sourceTrackId === trackId) ?? null;
  }

  private async findRuleBySourceReleaseAndArtist(
    rules: LoadedRule[],
    meta: IncomingListenMeta,
  ): Promise<LoadedRule | null> {
    const albumRules = rules.filter(
      (r) => r.kind === "album" && r.sourceReleaseId,
    );
    if (albumRules.length > 0) {
      const releaseId = await this.catalog.peekIncomingReleaseId(meta);
      if (releaseId) {
        const match = albumRules.find((r) => r.sourceReleaseId === releaseId);
        if (match) return match;
      }
    }

    const artistRules = rules.filter(
      (r) => r.kind === "artist" && r.sourceArtistId,
    );
    if (artistRules.length > 0) {
      const artistId = await this.catalog.peekIncomingArtistId(meta);
      if (artistId) {
        const match = artistRules.find((r) => r.sourceArtistId === artistId);
        if (match) return match;
      }
    }

    return null;
  }

  private findBestRule(
    rules: LoadedRule[],
    artistNorm: string,
    albumNorm: string | null,
    trackNorm: string,
  ): LoadedRule | null {
    const trackRules = rules.filter((r) => r.kind === "track");
    for (const r of trackRules) {
      if (r.matchArtistNorm !== artistNorm) continue;
      if (r.matchTrackNorm && r.matchTrackNorm !== trackNorm) continue;
      // Album refines the match only when both sides specify one.
      if (r.matchAlbumNorm && albumNorm && r.matchAlbumNorm !== albumNorm) {
        continue;
      }
      return r;
    }

    const albumRules = rules.filter((r) => r.kind === "album");
    for (const r of albumRules) {
      if (r.matchArtistNorm !== artistNorm) continue;
      if (r.matchAlbumNorm && albumNorm && r.matchAlbumNorm !== albumNorm) {
        continue;
      }
      return r;
    }

    const artistRules = rules.filter((r) => r.kind === "artist");
    for (const r of artistRules) {
      if (r.matchArtistNorm === artistNorm) return r;
    }

    return null;
  }

  private async loadUserRules(userId: string): Promise<LoadedRule[]> {
    const cached = this.rulesCache.get(userId);
    if (
      cached &&
      Date.now() - cached.loadedAt < CorrectionsService.CACHE_TTL_MS
    ) {
      return cached.rules;
    }

    const rows = await this.prisma.userMusicRule.findMany({
      where: { userId },
      include: {
        targetArtists: {
          include: { artist: true },
          orderBy: { position: "asc" },
        },
      },
    });

    const rules: LoadedRule[] = rows.map((r) => ({
      id: r.id,
      kind: r.kind as RuleKind,
      matchArtistNorm: r.matchArtistNorm,
      matchAlbumNorm: r.matchAlbumNorm,
      matchTrackNorm: r.matchTrackNorm,
      sourceTrackId: r.sourceTrackId,
      sourceReleaseId: r.sourceReleaseId,
      sourceArtistId: r.sourceArtistId,
      targetTrackTitle: r.targetTrackTitle,
      targetTrackId: r.targetTrackId,
      targetAlbumTitle: r.targetAlbumTitle,
      targetAlbumId: r.targetAlbumId,
      artists: r.targetArtists.map((ta) => ({
        id: ta.artist.id,
        name: ta.artist.name,
        position: ta.position,
      })),
    }));

    await this.hydrateMissingTrackTargets(userId, rules);

    this.rulesCache.set(userId, { loadedAt: Date.now(), rules });
    return rules;
  }

  private async hydrateMissingTrackTargets(
    userId: string,
    rules: LoadedRule[],
  ) {
    for (const rule of rules) {
      if (
        rule.kind !== "track" ||
        rule.targetTrackId ||
        !rule.targetTrackTitle ||
        rule.artists.length === 0
      ) {
        continue;
      }

      const resolved = await this.catalog.resolveCorrectedTrack({
        artistIds: rule.artists.map((a) => a.id),
        trackTitle: rule.targetTrackTitle,
        albumTitle: rule.targetAlbumTitle,
        albumId: rule.targetAlbumId,
      });
      rule.targetTrackId = resolved.id;
      if (!rule.targetAlbumId) {
        rule.targetAlbumId = resolved.releaseId;
      }

      void this.prisma.userMusicRule
        .update({
          where: { id: rule.id },
          data: {
            targetTrackId: resolved.id,
            targetAlbumId: rule.targetAlbumId,
          },
        })
        .catch(() => undefined);
    }
  }

  private invalidateRulesCache(userId: string) {
    this.rulesCache.delete(userId);
  }
}
