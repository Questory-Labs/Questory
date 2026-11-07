import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, NotFoundException, RequestMethod } from "@nestjs/common";
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from "@nestjs/common/constants";
import { LetterboxdConnectService } from "../../src/watch/letterboxd/letterboxd-connect.service";
import { LetterboxdConnectController } from "../../src/watch/letterboxd/letterboxd-connect.controller";
import { SessionUserGuard } from "../../src/watch/auth/session-user.guard";
import type { PrismaService } from "../../src/prisma/prisma.service";

const KEY = { userId_provider: { userId: "u1", provider: "letterboxd" } };

describe("LetterboxdConnectService", () => {
  const findUnique = vi.fn();
  const upsert = vi.fn();
  const del = vi.fn();
  const findMany = vi.fn();
  let service: LetterboxdConnectService;

  beforeEach(() => {
    findUnique.mockReset();
    upsert.mockReset().mockImplementation(async ({ create }) => ({
      externalUserId: create.externalUserId,
      lastSyncedAt: null,
      syncCursor: null,
    }));
    del.mockReset().mockResolvedValue({});
    findMany.mockReset().mockResolvedValue([]);
    service = new LetterboxdConnectService({
      sourceConnection: { findUnique, upsert, delete: del, findMany },
    } as unknown as PrismaService);
  });

  describe("getStatus", () => {
    it("returns a disconnected shape when no row exists", async () => {
      findUnique.mockResolvedValue(null);
      await expect(service.getStatus("u1")).resolves.toEqual({
        connected: false,
        username: null,
        lastSyncedAt: null,
        syncCursor: null,
      });
      expect(findUnique).toHaveBeenCalledWith({ where: KEY });
    });

    it("serializes the connected row", async () => {
      findUnique.mockResolvedValue({
        externalUserId: "cinephile",
        lastSyncedAt: new Date("2024-05-01T10:00:00.000Z"),
        syncCursor: "2024-04-30",
      });
      await expect(service.getStatus("u1")).resolves.toEqual({
        connected: true,
        username: "cinephile",
        lastSyncedAt: "2024-05-01T10:00:00.000Z",
        syncCursor: "2024-04-30",
      });
    });

    it("returns a null timestamp before the first sync", async () => {
      findUnique.mockResolvedValue({
        externalUserId: "cinephile",
        lastSyncedAt: null,
        syncCursor: null,
      });
      const status = await service.getStatus("u1");
      expect(status.connected).toBe(true);
      expect(status.lastSyncedAt).toBeNull();
    });

    it("never exposes the stored access token", async () => {
      findUnique.mockResolvedValue({
        externalUserId: "cinephile",
        accessToken: "secret",
        lastSyncedAt: null,
        syncCursor: null,
      });
      expect(JSON.stringify(await service.getStatus("u1"))).not.toContain(
        "secret",
      );
    });
  });

  describe("connect", () => {
    it.each([
      ["Cinephile", "cinephile"],
      ["@Cinephile", "cinephile"],
      ["  @Film_Fan-99  ", "film_fan-99"],
    ])("normalizes %j to %j", async (input, expected) => {
      const result = await service.connect("u1", input);
      expect(result.username).toBe(expected);
      expect(upsert).toHaveBeenCalledWith({
        where: KEY,
        create: {
          userId: "u1",
          provider: "letterboxd",
          externalUserId: expected,
          accessToken: "",
        },
        update: { externalUserId: expected },
      });
    });

    it.each(["", "   ", "@", " @ "])(
      "requires a username after normalizing %j",
      async (input) => {
        await expect(service.connect("u1", input)).rejects.toThrow(
          "Username is required",
        );
        expect(upsert).not.toHaveBeenCalled();
      },
    );

    it.each([
      "../admin",
      "a/b",
      "a b",
      "user?x=1",
      "user#frag",
      "https://letterboxd.com/user",
      "user.name",
      "ユーザー",
      "user%2F",
      "@@user",
    ])("rejects unsafe username %j", async (input) => {
      await expect(service.connect("u1", input)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(upsert).not.toHaveBeenCalled();
    });

    it("keeps existing sync state in the response on reconnect", async () => {
      upsert.mockResolvedValue({
        externalUserId: "cinephile",
        lastSyncedAt: new Date("2024-05-01T10:00:00.000Z"),
        syncCursor: "2024-04-30",
      });
      await expect(service.connect("u1", "cinephile")).resolves.toEqual({
        connected: true,
        username: "cinephile",
        lastSyncedAt: "2024-05-01T10:00:00.000Z",
        syncCursor: "2024-04-30",
      });
    });

    it("propagates database failures", async () => {
      upsert.mockRejectedValue(new Error("db down"));
      await expect(service.connect("u1", "cinephile")).rejects.toThrow(
        "db down",
      );
    });
  });

  describe("disconnect", () => {
    it("deletes only the caller's connection", async () => {
      findUnique.mockResolvedValue({ id: "c1" });
      await expect(service.disconnect("u1")).resolves.toEqual({ ok: true });
      expect(findUnique).toHaveBeenCalledWith({ where: KEY });
      expect(del).toHaveBeenCalledWith({ where: KEY });
    });

    it("throws NotFound and deletes nothing when not connected", async () => {
      findUnique.mockResolvedValue(null);
      await expect(service.disconnect("u1")).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(del).not.toHaveBeenCalled();
    });
  });

  describe("listConnections", () => {
    it("selects only letterboxd rows and non-secret columns", async () => {
      const rows = [{ userId: "u1", externalUserId: "a" }];
      findMany.mockResolvedValue(rows);
      await expect(service.listConnections()).resolves.toBe(rows);
      expect(findMany).toHaveBeenCalledWith({
        where: { provider: "letterboxd" },
        select: {
          userId: true,
          externalUserId: true,
          syncCursor: true,
          lastSyncedAt: true,
        },
      });
    });
  });
});

describe("LetterboxdConnectController", () => {
  const getStatus = vi.fn();
  const connect = vi.fn();
  const disconnect = vi.fn();
  let controller: LetterboxdConnectController;

  beforeEach(() => {
    getStatus.mockReset().mockResolvedValue({ connected: false });
    connect.mockReset().mockResolvedValue({ connected: true });
    disconnect.mockReset().mockResolvedValue({ ok: true });
    controller = new LetterboxdConnectController({
      getStatus,
      connect,
      disconnect,
    } as unknown as LetterboxdConnectService);
  });

  it("routes status for the session user", async () => {
    await expect(controller.status("u1")).resolves.toEqual({
      connected: false,
    });
    expect(getStatus).toHaveBeenCalledWith("u1");
  });

  it("forwards only the validated username", async () => {
    await controller.connectUser("u1", {
      username: "cinephile",
      userId: "victim",
    });
    expect(connect).toHaveBeenCalledWith("u1", "cinephile");
  });

  it("accepts a 64 character username", () => {
    const name = "a".repeat(64);
    controller.connectUser("u1", { username: name });
    expect(connect).toHaveBeenCalledWith("u1", name);
  });

  it.each([
    ["missing body", undefined],
    ["null body", null],
    ["string body", "cinephile"],
    ["array body", ["cinephile"]],
    ["missing username", {}],
    ["empty username", { username: "" }],
    ["numeric username", { username: 42 }],
    ["object username", { username: { $ne: "" } }],
    ["65 character username", { username: "a".repeat(65) }],
  ])("rejects %s before reaching the service", (_label, body) => {
    expect(() => controller.connectUser("u1", body)).toThrow(
      BadRequestException,
    );
    expect(connect).not.toHaveBeenCalled();
  });

  it("disconnects the session user", async () => {
    await expect(controller.disconnect("u1")).resolves.toEqual({ ok: true });
    expect(disconnect).toHaveBeenCalledWith("u1");
  });

  it.each([
    ["status", "status", RequestMethod.GET],
    ["connectUser", "connect", RequestMethod.POST],
    ["disconnect", "connect", RequestMethod.DELETE],
  ] as const)(
    "guards %s with the session guard",
    (handlerName, path, method) => {
      const handler = LetterboxdConnectController.prototype[handlerName];
      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(
        SessionUserGuard,
      );
      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(method);
    },
  );

  it("mounts under watch/letterboxd", () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, LetterboxdConnectController),
    ).toBe("watch/letterboxd");
  });
});
