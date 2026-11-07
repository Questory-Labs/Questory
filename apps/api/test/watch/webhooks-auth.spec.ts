import { afterEach, describe, expect, it, vi } from "vitest";
import "reflect-metadata";
import { UnauthorizedException, VERSION_NEUTRAL } from "@nestjs/common";
import { PATH_METADATA, VERSION_METADATA } from "@nestjs/common/constants";
import { WebhooksController } from "../../src/watch/webhooks/webhooks.controller";
import { WebhooksService } from "../../src/watch/webhooks/webhooks.service";
import type { CatalogService } from "../../src/watch/catalog/catalog.service";
import type { EnrichmentService } from "../../src/watch/enrichment/enrichment.service";
import type { UsersService } from "../../src/watch/users/users.service";

function setup(opts: { tokenUser?: { id: string } | null; sole?: { id: string } | null } = {}) {
  const users = {
    findByWebhookToken: vi.fn().mockResolvedValue(opts.tokenUser ?? null),
    resolveSoleUser: vi.fn().mockResolvedValue(opts.sole ?? null),
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
  return { service, users, catalog, enrichment };
}

const scrobble = {
  event: "media.scrobble",
  Metadata: { type: "movie", title: "Heat" },
};

describe("WebhooksService.resolveWebhookUser", () => {
  const savedMode = process.env.APP_MODE;

  afterEach(() => {
    process.env.APP_MODE = savedMode;
  });

  it("resolves the owner of a valid token", async () => {
    const { service, users } = setup({ tokenUser: { id: "owner" } });
    await expect(service.resolveWebhookUser("tok")).resolves.toEqual({ id: "owner" });
    expect(users.findByWebhookToken).toHaveBeenCalledWith("tok");
    expect(users.resolveSoleUser).not.toHaveBeenCalled();
  });

  it("trims the token and uses the first value of a repeated header", async () => {
    const { service, users } = setup({ tokenUser: { id: "owner" } });
    await service.resolveWebhookUser(["  first  ", "second"]);
    expect(users.findByWebhookToken).toHaveBeenCalledWith("first");
  });

  it.each(["local", "selfhosted", "production"])(
    "rejects an invalid token in %s mode without falling back to the sole user",
    async (mode) => {
      process.env.APP_MODE = mode;
      const { service, users } = setup({ sole: { id: "sole" } });
      await expect(service.resolveWebhookUser("wrong")).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(users.resolveSoleUser).not.toHaveBeenCalled();
    },
  );

  it.each(["selfhosted", "selfhosted-full", "production"])(
    "requires a token in %s mode",
    async (mode) => {
      process.env.APP_MODE = mode;
      const { service, users } = setup({ sole: { id: "sole" } });
      await expect(service.resolveWebhookUser()).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(users.resolveSoleUser).not.toHaveBeenCalled();
    },
  );

  it.each([[undefined], [""], ["   "], [[]]])(
    "treats %j as missing outside local mode",
    async (secret) => {
      process.env.APP_MODE = "production";
      const { service, users } = setup({ sole: { id: "sole" } });
      await expect(
        service.resolveWebhookUser(secret as string | string[] | undefined),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(users.findByWebhookToken).not.toHaveBeenCalled();
    },
  );

  it("falls back to the sole user in local mode", async () => {
    process.env.APP_MODE = "local";
    const { service } = setup({ sole: { id: "sole" } });
    await expect(service.resolveWebhookUser()).resolves.toEqual({ id: "sole" });
  });

  it("rejects in local mode when there is no sole user", async () => {
    process.env.APP_MODE = "local";
    const { service } = setup({ sole: null });
    await expect(service.resolveWebhookUser()).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it.each(["handlePlex", "handleJellyfin"] as const)(
    "%s writes nothing when authentication fails",
    async (handler) => {
      process.env.APP_MODE = "production";
      const { service, catalog } = setup();
      await expect(service[handler](scrobble, "wrong")).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(catalog.upsertTitle).not.toHaveBeenCalled();
      expect(catalog.recordWatch).not.toHaveBeenCalled();
    },
  );

  it.each(["handlePlex", "handleJellyfin"] as const)(
    "%s attributes the watch to the token owner only",
    async (handler) => {
      process.env.APP_MODE = "production";
      const { service, catalog } = setup({ tokenUser: { id: "owner" } });
      await service[handler](
        {
          ...scrobble,
          userId: "victim",
          NotificationType: "PlaybackStop",
          PlayedToCompletion: true,
          Name: "Heat",
          ItemType: "Movie",
        },
        "tok",
      );
      expect(catalog.recordWatch.mock.calls[0]![0].userId).toBe("owner");
    },
  );
});

describe("WebhooksController", () => {
  function controllerSetup() {
    const webhooks = {
      handlePlex: vi.fn().mockResolvedValue({ ok: true }),
      handleJellyfin: vi.fn().mockResolvedValue({ ok: true }),
    };
    const controller = new WebhooksController(webhooks as unknown as WebhooksService);
    return { controller, webhooks };
  }

  it("mounts unversioned at /webhooks", () => {
    expect(Reflect.getMetadata(PATH_METADATA, WebhooksController)).toBe("webhooks");
    expect(Reflect.getMetadata(VERSION_METADATA, WebhooksController)).toBe(VERSION_NEUTRAL);
  });

  it("parses a multipart payload string", async () => {
    const { controller, webhooks } = controllerSetup();
    await controller.plex({ payload: JSON.stringify(scrobble) }, "tok");
    expect(webhooks.handlePlex).toHaveBeenCalledWith(scrobble, "tok");
  });

  it("passes a plain JSON body through", async () => {
    const { controller, webhooks } = controllerSetup();
    await controller.plex(scrobble, "tok");
    expect(webhooks.handlePlex).toHaveBeenCalledWith(scrobble, "tok");
  });

  it("passes the raw body on when the payload string is not JSON", async () => {
    const { controller, webhooks } = controllerSetup();
    const body = { payload: "{broken" };
    await controller.plex(body, "tok");
    expect(webhooks.handlePlex).toHaveBeenCalledWith(body, "tok");
  });

  it("leaves a non-string payload unparsed", async () => {
    const { controller, webhooks } = controllerSetup();
    const body = { payload: { event: "media.scrobble" } };
    await controller.plex(body as unknown as Record<string, unknown>, "tok");
    expect(webhooks.handlePlex).toHaveBeenCalledWith(body, "tok");
  });

  it("falls back to the request body, then to an empty object", async () => {
    const { controller, webhooks } = controllerSetup();
    const missing = undefined as unknown as Record<string, unknown>;
    await controller.plex(missing, "tok", { body: scrobble });
    expect(webhooks.handlePlex).toHaveBeenLastCalledWith(scrobble, "tok");
    await controller.plex(missing, undefined, {});
    expect(webhooks.handlePlex).toHaveBeenLastCalledWith({}, undefined);
  });

  it("forwards the jellyfin body and defaults a missing one", async () => {
    const { controller, webhooks } = controllerSetup();
    await controller.jellyfin({ Name: "x" }, "tok");
    expect(webhooks.handleJellyfin).toHaveBeenLastCalledWith({ Name: "x" }, "tok");
    await controller.jellyfin(undefined as unknown as Record<string, unknown>);
    expect(webhooks.handleJellyfin).toHaveBeenLastCalledWith({}, undefined);
  });
});
