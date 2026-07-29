import { beforeEach, describe, expect, it, vi } from "vitest";
import { CorrectionsService } from "../../src/music/corrections/corrections.service";
import type { CatalogService } from "../../src/music/catalog/catalog.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

describe("CorrectionsService", () => {
  const userMusicRuleFindMany = vi.fn();
  const userMusicRuleFindFirst = vi.fn();
  const userMusicRuleFindUnique = vi.fn();
  const userMusicRuleCreate = vi.fn();
  const userMusicRuleUpdate = vi.fn();
  const userMusicRuleDeleteMany = vi.fn();
  const userMusicRuleArtistDeleteMany = vi.fn();
  const userMusicRuleArtistCreate = vi.fn();
  const userMusicLabelFindUnique = vi.fn();
  const userMusicLabelUpsert = vi.fn();
  const userMusicLabelDeleteMany = vi.fn();
  const listenFindMany = vi.fn();
  const listenFindUnique = vi.fn();
  const listenUpdate = vi.fn();
  const listenDelete = vi.fn();
  const listenCount = vi.fn();
  const trackFindUnique = vi.fn();
  const artistFindUnique = vi.fn();

  const resolveCorrectedTrack = vi.fn();
  const upsertArtistPublic = vi.fn();
  const peekIncomingTrackId = vi.fn();
  const peekIncomingReleaseId = vi.fn();
  const peekIncomingArtistId = vi.fn();
  const resolveCorrectedRelease = vi.fn();

  let service: CorrectionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    userMusicRuleFindMany.mockResolvedValue([]);

    const prisma = {
      userMusicRule: {
        findMany: userMusicRuleFindMany,
        findFirst: userMusicRuleFindFirst,
        findUnique: userMusicRuleFindUnique,
        create: userMusicRuleCreate,
        update: userMusicRuleUpdate,
        deleteMany: userMusicRuleDeleteMany,
      },
      userMusicRuleArtist: {
        deleteMany: userMusicRuleArtistDeleteMany,
        create: userMusicRuleArtistCreate,
      },
      userMusicLabel: {
        findUnique: userMusicLabelFindUnique,
        upsert: userMusicLabelUpsert,
        deleteMany: userMusicLabelDeleteMany,
        findMany: vi.fn().mockResolvedValue([]),
      },
      listen: {
        findMany: listenFindMany,
        findUnique: listenFindUnique,
        update: listenUpdate,
        delete: listenDelete,
        count: listenCount,
      },
      track: {
        findUnique: trackFindUnique,
      },
      artist: {
        findUnique: artistFindUnique,
      },
    } as unknown as PrismaService;

    const catalog = {
      resolveCorrectedTrack,
      upsertArtistPublic,
      peekIncomingTrackId,
      peekIncomingReleaseId,
      peekIncomingArtistId,
      resolveCorrectedRelease,
    } as unknown as CatalogService;

    service = new CorrectionsService(prisma, catalog);
  });

  it("applies track rule to incoming metadata", async () => {
    userMusicRuleFindMany.mockResolvedValue([
      {
        id: "rule1",
        kind: "track",
        matchArtistNorm: "artist b",
        matchAlbumNorm: null,
        matchTrackNorm: "wrong song",
        sourceTrackId: null,
        sourceReleaseId: null,
        sourceArtistId: null,
        targetTrackTitle: "ABCD",
        targetTrackId: "t-target",
        targetAlbumTitle: "Album A",
        targetAlbumId: null,
        targetArtists: [
          {
            position: 0,
            artist: { id: "a1", name: "Artist A" },
          },
        ],
      },
    ]);

    const result = await service.applyRulesToMeta("user1", {
      artistName: "Artist B",
      trackName: "wrong song",
      releaseName: "Some Other Album",
      listenedAt: new Date(),
      listenType: "single",
    });

    expect(result.trackName).toBe("ABCD");
    expect(result.releaseName).toBe("Album A");
    expect(result.correctionArtistIds).toEqual(["a1"]);
    expect(result.correctionTargetTrackId).toBe("t-target");
  });

  it("applies album rule when scrobble omits album name", async () => {
    userMusicRuleFindMany.mockResolvedValue([
      {
        id: "rule-album",
        kind: "album",
        matchArtistNorm: "artist b",
        matchAlbumNorm: "old album",
        matchTrackNorm: null,
        sourceTrackId: null,
        sourceReleaseId: "r-old",
        sourceArtistId: null,
        targetTrackTitle: null,
        targetTrackId: null,
        targetAlbumTitle: "Album A",
        targetAlbumId: "r-target",
        targetArtists: [
          {
            position: 0,
            artist: { id: "a1", name: "Artist A" },
          },
        ],
      },
    ]);

    const result = await service.applyRulesToMeta("user1", {
      artistName: "Artist B",
      trackName: "Song",
      releaseName: null,
      listenedAt: new Date(),
      listenType: "single",
    });

    expect(result.releaseName).toBe("Album A");
    expect(result.correctionArtistIds).toEqual(["a1"]);
    expect(result.correctionTargetAlbumId).toBe("r-target");
    expect(result.trackName).toBe("Song");
  });

  it("falls back to source release id for album rules", async () => {
    userMusicRuleFindMany.mockResolvedValue([
      {
        id: "rule-album",
        kind: "album",
        matchArtistNorm: "artist b",
        matchAlbumNorm: "old album",
        matchTrackNorm: null,
        sourceTrackId: null,
        sourceReleaseId: "r-old",
        sourceArtistId: null,
        targetTrackTitle: null,
        targetTrackId: null,
        targetAlbumTitle: "Album A",
        targetAlbumId: "r-target",
        targetArtists: [
          {
            position: 0,
            artist: { id: "a1", name: "Artist A" },
          },
        ],
      },
    ]);
    peekIncomingReleaseId.mockResolvedValue("r-old");

    const result = await service.applyRulesToMeta("user1", {
      artistName: "Artist B",
      trackName: "Song",
      releaseName: "Different Album Label",
      listenedAt: new Date(),
      listenType: "single",
    });

    expect(result.releaseName).toBe("Album A");
    expect(peekIncomingReleaseId).toHaveBeenCalled();
  });

  it("applies artist rule using primary artist from feat. string", async () => {
    userMusicRuleFindMany.mockResolvedValue([
      {
        id: "rule-artist",
        kind: "artist",
        matchArtistNorm: "artist b",
        matchAlbumNorm: null,
        matchTrackNorm: null,
        sourceTrackId: null,
        sourceReleaseId: null,
        sourceArtistId: "b1",
        targetTrackTitle: null,
        targetTrackId: null,
        targetAlbumTitle: null,
        targetAlbumId: null,
        targetArtists: [
          {
            position: 0,
            artist: { id: "a1", name: "Artist A" },
          },
        ],
      },
    ]);

    const result = await service.applyRulesToMeta("user1", {
      artistName: "Artist B feat. Guest",
      trackName: "Song",
      releaseName: "Album",
      listenedAt: new Date(),
      listenType: "single",
    });

    expect(result.artistName).toBe("Artist A");
    expect(result.trackName).toBe("Song");
    expect(result.releaseName).toBe("Album");
    expect(result.correctionArtistIds).toEqual(["a1"]);
  });

  it("falls back to source track id when metadata matching fails", async () => {
    userMusicRuleFindMany.mockResolvedValue([
      {
        id: "rule-merge",
        kind: "track",
        matchArtistNorm: "artist b",
        matchAlbumNorm: "old album",
        matchTrackNorm: "old song",
        sourceTrackId: "t-source",
        sourceReleaseId: null,
        sourceArtistId: null,
        targetTrackTitle: "Song",
        targetTrackId: "t-target",
        targetAlbumTitle: "Album A",
        targetAlbumId: "r1",
        targetArtists: [
          {
            position: 0,
            artist: { id: "a1", name: "Artist A" },
          },
        ],
      },
    ]);
    peekIncomingTrackId.mockResolvedValue("t-source");

    const result = await service.applyRulesToMeta("user1", {
      artistName: "Artist B",
      trackName: "Totally Different Title",
      releaseName: "Old Album",
      listenedAt: new Date(),
      listenType: "single",
    });

    expect(result.correctionTargetTrackId).toBe("t-target");
    expect(result.trackName).toBe("Song");
    expect(peekIncomingTrackId).toHaveBeenCalled();
  });

  it("saves label-only correction when assignment unchanged", async () => {
    trackFindUnique.mockResolvedValue({
      id: "t1",
      title: "Song",
      titleNormalized: "song",
      artistId: "a1",
      releaseId: null,
      artist: { id: "a1", name: "Artist A", nameNormalized: "artist a" },
      release: null,
      featuredArtists: [],
    });
    userMusicRuleFindFirst.mockResolvedValue(null);
    artistFindUnique.mockResolvedValue({ id: "a1", name: "Artist A" });

    await service.saveTrackCorrection("user1", "t1", {
      trackTitle: "Song",
      artists: [{ id: "a1", name: "Artist A" }],
      displayName: "My Song",
    });

    expect(userMusicLabelUpsert).toHaveBeenCalled();
    expect(userMusicRuleCreate).not.toHaveBeenCalled();
    expect(userMusicRuleDeleteMany).toHaveBeenCalled();
  });

  it("updates only track title when other fields are omitted", async () => {
    trackFindUnique.mockResolvedValue({
      id: "t1",
      title: "Old Song",
      titleNormalized: "old song",
      artistId: "a1",
      releaseId: "r1",
      artist: { id: "a1", name: "Artist A", nameNormalized: "artist a" },
      release: { id: "r1", title: "Album A", titleNormalized: "album a" },
      featuredArtists: [],
    });
    userMusicRuleFindFirst.mockResolvedValue(null);
    artistFindUnique.mockResolvedValue({ id: "a1", name: "Artist A" });
    userMusicRuleCreate.mockResolvedValue({
      id: "rule1",
      kind: "track",
      matchArtistNorm: "artist a",
      matchAlbumNorm: "album a",
      matchTrackNorm: "old song",
    });
    resolveCorrectedTrack.mockResolvedValue({ id: "t2", releaseId: "r1" });
    userMusicRuleFindUnique.mockResolvedValue({
      id: "rule1",
      kind: "track",
      matchArtistNorm: "artist a",
      matchAlbumNorm: "album a",
      matchTrackNorm: "old song",
    });
    listenFindMany.mockResolvedValue([]);

    const result = await service.saveTrackCorrection("user1", "t1", {
      trackTitle: "New Song",
    });

    expect(result.reassigned).toBe(true);
    expect(resolveCorrectedTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        artistIds: ["a1"],
        trackTitle: "New Song",
        albumTitle: "Album A",
      }),
    );
    expect(userMusicLabelUpsert).not.toHaveBeenCalled();
  });

  it("creates rule and backfills when artist changes", async () => {
    trackFindUnique.mockResolvedValue({
      id: "t1",
      title: "Song",
      titleNormalized: "song",
      artistId: "b1",
      releaseId: null,
      artist: { id: "b1", name: "Artist B", nameNormalized: "artist b" },
      release: null,
      featuredArtists: [],
    });
    userMusicRuleFindFirst.mockResolvedValue(null);
    artistFindUnique.mockResolvedValue({ id: "a1", name: "Artist A" });
    userMusicRuleFindFirst.mockResolvedValue(null);
    userMusicRuleCreate.mockResolvedValue({
      id: "rule1",
      kind: "track",
      matchArtistNorm: "artist b",
      matchAlbumNorm: null,
      matchTrackNorm: "song",
    });
    upsertArtistPublic.mockResolvedValue({ id: "a1", name: "Artist A" });
    resolveCorrectedTrack.mockResolvedValue({ id: "t2", releaseId: null });
    userMusicRuleFindUnique.mockResolvedValue({
      id: "rule1",
      kind: "track",
      matchArtistNorm: "artist b",
      matchAlbumNorm: null,
      matchTrackNorm: "song",
    });
    listenFindMany.mockResolvedValue([
      { id: "l1", listenedAt: new Date("2024-01-01"), trackId: "t1" },
    ]);
    listenFindUnique.mockResolvedValue(null);

    const result = await service.saveTrackCorrection("user1", "t1", {
      trackTitle: "Song",
      artists: [{ id: "a1", name: "Artist A" }],
    });

    expect(result.reassigned).toBe(true);
    expect(userMusicRuleCreate).toHaveBeenCalled();
    expect(resolveCorrectedTrack).toHaveBeenCalled();
    expect(listenUpdate).toHaveBeenCalledWith({
      where: { id: "l1" },
      data: { trackId: "t2" },
    });
  });

  it("deletes duplicate listen on backfill conflict", async () => {
    userMusicRuleFindUnique.mockResolvedValue({
      id: "rule1",
      kind: "track",
      matchArtistNorm: "artist b",
      matchAlbumNorm: null,
      matchTrackNorm: "song",
    });
    listenFindMany.mockResolvedValue([
      { id: "l1", listenedAt: new Date("2024-01-01"), trackId: "t1" },
    ]);
    listenFindUnique.mockResolvedValue({ id: "l2" });

    await service.backfillForRule("user1", { id: "rule1", kind: "track" }, "t2");

    expect(listenDelete).toHaveBeenCalledWith({ where: { id: "l1" } });
    expect(listenUpdate).not.toHaveBeenCalled();
  });

  it("resolves user display label", async () => {
    userMusicLabelFindUnique.mockResolvedValue({
      displayName: "ABCD",
    });

    const name = await service.resolveDisplayName(
      "user1",
      "track",
      "t1",
      "ab-cd",
    );

    expect(name).toBe("ABCD");
  });

  it("merges user listens from source track into target track", async () => {
    trackFindUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === "t1") {
        return Promise.resolve({
          id: "t1",
          title: "Old Song",
          titleNormalized: "old song",
          artistId: "b1",
          releaseId: "r-old",
          artist: { id: "b1", name: "Artist B", nameNormalized: "artist b" },
          release: { id: "r-old", title: "Old Album", titleNormalized: "old album" },
          featuredArtists: [],
        });
      }
      return Promise.resolve({
        id: "t2",
        title: "Song",
        titleNormalized: "song",
        artistId: "a1",
        releaseId: "r1",
        artist: { id: "a1", name: "Artist A", nameNormalized: "artist a" },
        release: { id: "r1", title: "Album A", titleNormalized: "album a" },
        featuredArtists: [],
      });
    });
    userMusicRuleFindFirst.mockResolvedValue(null);
    userMusicRuleCreate.mockResolvedValue({ id: "rule1" });
    userMusicRuleArtistDeleteMany.mockResolvedValue(undefined);
    userMusicRuleArtistCreate.mockResolvedValue(undefined);
    listenFindMany.mockResolvedValue([
      { id: "l1", listenedAt: new Date("2024-01-01") },
      { id: "l2", listenedAt: new Date("2024-01-02") },
    ]);
    listenFindUnique.mockResolvedValue(null);

    const result = await service.mergeTrackInto("user1", "t1", "t2");

    expect(result).toEqual({ ok: true, trackId: "t2", mergedListenCount: 2 });
    expect(userMusicRuleCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: "track",
          sourceTrackId: "t1",
          matchTrackNorm: "old song",
          targetTrackTitle: "Song",
          targetTrackId: "t2",
        }),
      }),
    );
    expect(listenUpdate).toHaveBeenCalledTimes(2);
    expect(userMusicLabelDeleteMany).toHaveBeenCalledWith({
      where: { userId: "user1", entityKind: "track", entityId: "t1" },
    });
  });

  it("rejects merging a track into itself", async () => {
    await expect(service.mergeTrackInto("user1", "t1", "t1")).rejects.toThrow(
      "Cannot merge a track into itself",
    );
  });
});

describe("Analytics artist tops with featured artists", () => {
  it("counts primary and featured artists with full weight", () => {
    const listens = [
      {
        track: {
          artist: { id: "a1", name: "Artist A", imageUrl: null },
          featuredArtists: [
            { artist: { id: "a2", name: "Artist B", imageUrl: null } },
          ],
        },
      },
      {
        track: {
          artist: { id: "a1", name: "Artist A", imageUrl: null },
          featuredArtists: [],
        },
      },
    ];

    const counts = new Map<
      string,
      { id: string; name: string; count: number }
    >();
    const bump = (a: { id: string; name: string }) => {
      const cur = counts.get(a.id) || { id: a.id, name: a.name, count: 0 };
      cur.count += 1;
      counts.set(a.id, cur);
    };
    for (const l of listens) {
      bump(l.track.artist);
      for (const fa of l.track.featuredArtists) {
        bump(fa.artist);
      }
    }

    expect(counts.get("a1")?.count).toBe(2);
    expect(counts.get("a2")?.count).toBe(1);
  });
});
