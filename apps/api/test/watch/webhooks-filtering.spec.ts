import { describe, expect, it, vi } from "vitest";
import { WebhooksController } from "../../src/watch/webhooks/webhooks.controller";
import { WebhooksService } from "../../src/watch/webhooks/webhooks.service";
import type { CatalogService } from "../../src/watch/catalog/catalog.service";
import type { EnrichmentService } from "../../src/watch/enrichment/enrichment.service";
import type { UsersService } from "../../src/watch/users/users.service";

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
  const service = new WebhooksService(
    catalog as unknown as CatalogService,
    { enqueueTitle: vi.fn() } as unknown as EnrichmentService,
    users as unknown as UsersService,
  );
  return { service, catalog };
}

const item = { ItemType: "Movie", Name: "Heat" };

describe("Jellyfin finished-playback filter", () => {
  it.each([
    ["ItemAdded", { NotificationType: "ItemAdded", ...item }],
    ["PlaybackStart", { NotificationType: "PlaybackStart", PlayedToCompletion: true, ...item }],
    ["PlaybackProgress", { NotificationType: "PlaybackProgress", ...item }],
    ["play", { Event: "play", ...item }],
    ["no notification type", item],
    ["a nested item with no notification type", { Item: { Type: "Movie", Name: "Heat" } }],
    ["PlaybackStop with no completion flag", { NotificationType: "PlaybackStop", ...item }],
    ["PlaybackStop stopped early", { NotificationType: "PlaybackStop", PlayedToCompletion: false, ...item }],
    ["PlaybackStop stopped early as text", { NotificationType: "PlaybackStop", PlayedToCompletion: "False", ...item }],
  ])("does not record %s", async (_name, body) => {
    const { service, catalog } = setup();
    await expect(service.handleJellyfin(body, "tok")).resolves.toMatchObject({
      ok: true,
      ignored: true,
    });
    expect(catalog.upsertTitle).not.toHaveBeenCalled();
    expect(catalog.recordWatch).not.toHaveBeenCalled();
  });

  it.each([
    ["PlaybackStop completed", { NotificationType: "PlaybackStop", PlayedToCompletion: true, ...item }],
    ["PlaybackStop completed as text", { NotificationType: "playbackstop", PlayedToCompletion: "True", ...item }],
    ["scrobble", { Event: "scrobble", ...item }],
    ["media.scrobble alias", { notification_type: "media.scrobble", ...item }],
  ])("records %s", async (_name, body) => {
    const { service, catalog } = setup();
    await expect(service.handleJellyfin(body, "tok")).resolves.toEqual({
      ok: true,
      titleId: "t-1",
    });
    expect(catalog.recordWatch).toHaveBeenCalledTimes(1);
  });
});

describe("non-video webhook items", () => {
  it.each(["track", "album", "photo", "clip", ""])(
    "ignores a Plex scrobble of type %j",
    async (type) => {
      const { service, catalog } = setup();
      await expect(
        service.handlePlex(
          {
            event: "media.scrobble",
            Metadata: { type, title: "Song", grandparentTitle: "Artist" },
          },
          "tok",
        ),
      ).resolves.toEqual({ ok: true, ignored: true, reason: "unsupported type" });
      expect(catalog.upsertTitle).not.toHaveBeenCalled();
      expect(catalog.recordWatch).not.toHaveBeenCalled();
    },
  );

  it.each(["Audio", "AudioBook", "MusicVideo", "Book", ""])(
    "ignores a finished Jellyfin item of type %j",
    async (ItemType) => {
      const { service, catalog } = setup();
      await expect(
        service.handleJellyfin(
          {
            NotificationType: "PlaybackStop",
            PlayedToCompletion: true,
            ItemType,
            Name: "Song",
            SeriesName: "Artist",
          },
          "tok",
        ),
      ).resolves.toEqual({ ok: true, ignored: true, reason: "unsupported type" });
      expect(catalog.upsertTitle).not.toHaveBeenCalled();
      expect(catalog.recordWatch).not.toHaveBeenCalled();
    },
  );
});

describe("non-numeric webhook metadata", () => {
  it("does not pass NaN from Plex metadata", async () => {
    const { service, catalog } = setup();
    await service.handlePlex(
      {
        event: "media.scrobble",
        Metadata: {
          type: "episode",
          grandparentTitle: "Dark",
          parentIndex: "x",
          index: "y",
          duration: "abc",
        },
      },
      "tok",
    );
    expect(catalog.upsertEpisode.mock.calls[0]![0]).toMatchObject({
      seasonNumber: 0,
      episodeNumber: 0,
      runtimeMinutes: null,
    });
    expect(catalog.recordWatch.mock.calls[0]![0].runtimeMinutes).toBeNull();
  });

  it("does not pass NaN from a Plex movie duration", async () => {
    const { service, catalog } = setup();
    await service.handlePlex(
      {
        event: "media.scrobble",
        Metadata: { type: "movie", title: "X", duration: "abc" },
      },
      "tok",
    );
    expect(catalog.recordWatch.mock.calls[0]![0].runtimeMinutes).toBeNull();
  });

  it("does not pass NaN from Jellyfin metadata", async () => {
    const { service, catalog } = setup();
    await service.handleJellyfin(
      {
        NotificationType: "PlaybackStop",
        PlayedToCompletion: true,
        Item: {
          Type: "Episode",
          SeriesName: "Dark",
          Name: "Pilot",
          ParentIndexNumber: "x",
          IndexNumber: "y",
          RunTimeTicks: "abc",
        },
      },
      "tok",
    );
    expect(catalog.upsertEpisode.mock.calls[0]![0]).toMatchObject({
      seasonNumber: 0,
      episodeNumber: 0,
      runtimeMinutes: null,
    });
  });
});

describe("Plex payload strings that are not objects", () => {
  it.each(["null", "5", '"text"', "true"])(
    "treats payload %s as ignorable instead of crashing",
    async (payload) => {
      const { service, catalog } = setup();
      const controller = new WebhooksController(service);
      await expect(controller.plex({ payload }, "tok")).resolves.toEqual({
        ok: true,
        ignored: true,
        event: "",
      });
      expect(catalog.recordWatch).not.toHaveBeenCalled();
    },
  );
});
