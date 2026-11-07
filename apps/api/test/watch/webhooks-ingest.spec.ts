import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebhooksService } from "../../src/watch/webhooks/webhooks.service";
import type { CatalogService } from "../../src/watch/catalog/catalog.service";
import type { EnrichmentService } from "../../src/watch/enrichment/enrichment.service";
import type { UsersService } from "../../src/watch/users/users.service";

const NOW = new Date("2026-04-05T12:34:56.000Z");
const finished = { NotificationType: "PlaybackStop", PlayedToCompletion: true };

function setup() {
  const users = {
    findByWebhookToken: vi.fn().mockResolvedValue({ id: "owner" }),
    resolveSoleUser: vi.fn().mockResolvedValue(null),
  };
  const catalog = {
    upsertTitle: vi.fn().mockResolvedValue({ id: "t-1" }),
    upsertEpisode: vi.fn().mockResolvedValue({ id: "e-1" }),
    recordWatch: vi.fn().mockResolvedValue({}),
  };
  const enrichment = { enqueueTitle: vi.fn() };
  const service = new WebhooksService(
    catalog as unknown as CatalogService,
    enrichment as unknown as EnrichmentService,
    users as unknown as UsersService,
  );
  return { service, catalog, enrichment };
}

describe("WebhooksService.handlePlex", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(["media.play", "media.stop", "media.pause", "library.new", ""])(
    "ignores event %j without writing",
    async (event) => {
      const { service, catalog } = setup();
      const result = await service.handlePlex({ event, Metadata: { title: "x" } }, "tok");
      expect(result).toEqual({ ok: true, ignored: true, event });
      expect(catalog.upsertTitle).not.toHaveBeenCalled();
      expect(catalog.recordWatch).not.toHaveBeenCalled();
    },
  );

  it("ignores an empty body", async () => {
    const { service, catalog } = setup();
    await expect(service.handlePlex({}, "tok")).resolves.toEqual({
      ok: true,
      ignored: true,
      event: "",
    });
    expect(catalog.recordWatch).not.toHaveBeenCalled();
  });

  it.each([
    ["no metadata", { event: "media.scrobble" }],
    ["untitled metadata", { event: "media.scrobble", Metadata: { type: "movie" } }],
  ])("ignores a scrobble with %s", async (_name, body) => {
    const { service, catalog } = setup();
    await expect(service.handlePlex(body, "tok")).resolves.toEqual({
      ok: true,
      ignored: true,
      reason: "no title",
    });
    expect(catalog.upsertTitle).not.toHaveBeenCalled();
  });

  it("records a movie scrobble", async () => {
    const { service, catalog, enrichment } = setup();
    const body = {
      event: "media.scrobble",
      Metadata: {
        type: "movie",
        title: "Heat",
        year: 1995,
        ratingKey: "42",
        duration: 5_400_000,
      },
    };
    await expect(service.handlePlex(body, "tok")).resolves.toEqual({
      ok: true,
      titleId: "t-1",
    });
    expect(catalog.upsertTitle).toHaveBeenCalledWith({
      type: "movie",
      name: "Heat",
      year: 1995,
    });
    expect(catalog.upsertEpisode).not.toHaveBeenCalled();
    expect(catalog.recordWatch).toHaveBeenCalledWith({
      userId: "owner",
      titleId: "t-1",
      episodeId: undefined,
      watchedAt: NOW,
      source: "plex",
      dedupeKey: "plex:42:2026-04-05T12",
      action: "scrobble",
      precision: "second",
      runtimeMinutes: 90,
      rawPayload: JSON.stringify(body),
    });
    expect(enrichment.enqueueTitle).toHaveBeenCalledWith("t-1");
  });

  it("records an episode scrobble against the series", async () => {
    const { service, catalog } = setup();
    await service.handlePlex(
      {
        event: "media.scrobble",
        Metadata: {
          type: "episode",
          title: "Pilot",
          grandparentTitle: "Dark",
          parentIndex: 2,
          index: 5,
          duration: 2_700_000,
          guid: "plex://ep/1",
        },
      },
      "tok",
    );
    expect(catalog.upsertTitle.mock.calls[0]![0]).toMatchObject({
      type: "show",
      name: "Dark",
      year: null,
    });
    expect(catalog.upsertEpisode).toHaveBeenCalledWith({
      titleId: "t-1",
      seasonNumber: 2,
      episodeNumber: 5,
      name: "Pilot",
      runtimeMinutes: 45,
    });
    expect(catalog.recordWatch.mock.calls[0]![0]).toMatchObject({
      episodeId: "e-1",
      runtimeMinutes: 45,
      dedupeKey: "plex:plex://ep/1:2026-04-05T12",
    });
  });

  it("accepts seasonNumber and episodeNumber aliases", async () => {
    const { service, catalog } = setup();
    await service.handlePlex(
      {
        event: "media.scrobble",
        Metadata: { type: "episode", grandparentTitle: "S", seasonNumber: 3, episodeNumber: 4 },
      },
      "tok",
    );
    expect(catalog.upsertEpisode.mock.calls[0]![0]).toMatchObject({
      seasonNumber: 3,
      episodeNumber: 4,
      name: null,
      runtimeMinutes: null,
    });
  });

  it("nulls a non-numeric year", async () => {
    const { service, catalog } = setup();
    await service.handlePlex(
      { event: "media.scrobble", Metadata: { type: "movie", title: "X", year: "abc" } },
      "tok",
    );
    expect(catalog.upsertTitle.mock.calls[0]![0].year).toBeNull();
  });

  it("dedupes repeats in the same hour and not across hours", async () => {
    const { service, catalog } = setup();
    const body = {
      event: "media.scrobble",
      Metadata: { type: "movie", title: "X", ratingKey: "1" },
    };
    await service.handlePlex(body, "tok");
    vi.setSystemTime(new Date("2026-04-05T12:59:59.000Z"));
    await service.handlePlex(body, "tok");
    vi.setSystemTime(new Date("2026-04-05T13:00:00.000Z"));
    await service.handlePlex(body, "tok");
    expect(catalog.recordWatch.mock.calls.map(([a]) => a.dedupeKey)).toEqual([
      "plex:1:2026-04-05T12",
      "plex:1:2026-04-05T12",
      "plex:1:2026-04-05T13",
    ]);
  });

  it("uses the title for the dedupe key when no ids exist", async () => {
    const { service, catalog } = setup();
    await service.handlePlex(
      { event: "media.scrobble", Metadata: { type: "movie", title: "Plain" } },
      "tok",
    );
    expect(catalog.recordWatch.mock.calls[0]![0].dedupeKey).toBe(
      "plex:Plain:2026-04-05T12",
    );
  });

  it("caps the stored raw payload at 4000 characters", async () => {
    const { service, catalog } = setup();
    await service.handlePlex(
      {
        event: "media.scrobble",
        Metadata: { type: "movie", title: "X", summary: "y".repeat(10_000) },
      },
      "tok",
    );
    expect(catalog.recordWatch.mock.calls[0]![0].rawPayload).toHaveLength(4000);
  });

  it("does not enqueue enrichment when recording fails", async () => {
    const { service, catalog, enrichment } = setup();
    catalog.recordWatch.mockRejectedValue(new Error("db down"));
    await expect(
      service.handlePlex(
        { event: "media.scrobble", Metadata: { type: "movie", title: "X" } },
        "tok",
      ),
    ).rejects.toThrow("db down");
    expect(enrichment.enqueueTitle).not.toHaveBeenCalled();
  });
});

describe("WebhooksService.handleJellyfin", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ignores an empty body", async () => {
    const { service, catalog } = setup();
    await expect(service.handleJellyfin({}, "tok")).resolves.toEqual({
      ok: true,
      ignored: true,
      notificationType: "",
    });
    expect(catalog.upsertTitle).not.toHaveBeenCalled();
  });

  it("ignores an unrelated notification with no item", async () => {
    const { service } = setup();
    await expect(
      service.handleJellyfin({ NotificationType: "ServerRestart" }, "tok"),
    ).resolves.toEqual({
      ok: true,
      ignored: true,
      notificationType: "serverrestart",
    });
  });

  it.each([
    [{ ...finished }],
    [{ notification_type: "scrobble" }],
    [{ Event: "scrobble" }],
    [{ ...finished, Item: {} }],
  ])("reports no title for %j", async (body) => {
    const { service, catalog } = setup();
    await expect(service.handleJellyfin(body, "tok")).resolves.toEqual({
      ok: true,
      ignored: true,
      reason: "no title",
    });
    expect(catalog.upsertTitle).not.toHaveBeenCalled();
  });

  it("records a movie from a nested item", async () => {
    const { service, catalog, enrichment } = setup();
    const body = {
      ...finished,
      Item: { Type: "Movie", Name: "Heat", ProductionYear: 1995, Id: "abc" },
    };
    await expect(service.handleJellyfin(body, "tok")).resolves.toEqual({
      ok: true,
      titleId: "t-1",
    });
    expect(catalog.upsertTitle).toHaveBeenCalledWith({
      type: "movie",
      name: "Heat",
      year: 1995,
    });
    expect(catalog.upsertEpisode).not.toHaveBeenCalled();
    expect(catalog.recordWatch).toHaveBeenCalledWith({
      userId: "owner",
      titleId: "t-1",
      episodeId: undefined,
      watchedAt: NOW,
      source: "jellyfin",
      dedupeKey: "jellyfin:abc:2026-04-05T12",
      action: "scrobble",
      precision: "second",
      rawPayload: JSON.stringify(body),
    });
    expect(enrichment.enqueueTitle).toHaveBeenCalledWith("t-1");
  });

  it("records an episode from flat fields", async () => {
    const { service, catalog } = setup();
    await service.handleJellyfin(
      {
        ...finished,
        ItemType: "Episode",
        SeriesName: "Dark",
        Name: "Pilot",
        SeasonNumber: 2,
        EpisodeNumber: 5,
        RunTimeTicks: 27_000_000_000,
        ItemId: "flat",
      },
      "tok",
    );
    expect(catalog.upsertTitle.mock.calls[0]![0]).toMatchObject({
      type: "show",
      name: "Dark",
    });
    expect(catalog.upsertEpisode).toHaveBeenCalledWith({
      titleId: "t-1",
      seasonNumber: 2,
      episodeNumber: 5,
      name: "Pilot",
      runtimeMinutes: 45,
    });
    expect(catalog.recordWatch.mock.calls[0]![0]).toMatchObject({
      episodeId: "e-1",
      dedupeKey: "jellyfin:flat:2026-04-05T12",
    });
  });

  it("prefers parent and index numbers on a nested episode", async () => {
    const { service, catalog } = setup();
    await service.handleJellyfin(
      {
        ...finished,
        Item: {
          Type: "Episode",
          SeriesName: "Dark",
          Name: "Pilot",
          ParentIndexNumber: 1,
          IndexNumber: 7,
          SeasonNumber: 9,
          EpisodeNumber: 9,
        },
      },
      "tok",
    );
    expect(catalog.upsertEpisode.mock.calls[0]![0]).toMatchObject({
      seasonNumber: 1,
      episodeNumber: 7,
      runtimeMinutes: null,
    });
  });

  it("nulls a non-numeric production year", async () => {
    const { service, catalog } = setup();
    await service.handleJellyfin(
      {
        ...finished,
        Item: { Type: "Movie", Name: "X", ProductionYear: "soon" },
      },
      "tok",
    );
    expect(catalog.upsertTitle.mock.calls[0]![0].year).toBeNull();
  });

  it("dedupes on the item id within the hour, falling back to the name", async () => {
    const { service, catalog } = setup();
    const body = {
      ...finished,
      Item: { Type: "Movie", Name: "Plain" },
    };
    await service.handleJellyfin(body, "tok");
    await service.handleJellyfin(body, "tok");
    const keys = catalog.recordWatch.mock.calls.map(([a]) => a.dedupeKey);
    expect(keys).toEqual([
      "jellyfin:Plain:2026-04-05T12",
      "jellyfin:Plain:2026-04-05T12",
    ]);
  });

  it("caps the stored raw payload at 4000 characters", async () => {
    const { service, catalog } = setup();
    await service.handleJellyfin(
      {
        ...finished,
        Item: { Type: "Movie", Name: "X", Overview: "y".repeat(10_000) },
      },
      "tok",
    );
    expect(catalog.recordWatch.mock.calls[0]![0].rawPayload).toHaveLength(4000);
  });

  it("does not enqueue enrichment when recording fails", async () => {
    const { service, catalog, enrichment } = setup();
    catalog.recordWatch.mockRejectedValue(new Error("db down"));
    await expect(
      service.handleJellyfin(
        { ...finished, Item: { Type: "Movie", Name: "X" } },
        "tok",
      ),
    ).rejects.toThrow("db down");
    expect(enrichment.enqueueTitle).not.toHaveBeenCalled();
  });
});
