import { BadRequestException, Logger, NotFoundException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { ListSyncScope } from "@questorylabs/shared";
import {
  callHeaders,
  createListProviderHarness,
  fetchCalls,
  formBody,
  jsonRes,
  makeConn,
  textRes,
  type ListProviderClass,
} from "./list-provider-harness";

type LifecycleService = {
  getConnection(
    userId?: string,
  ): Promise<{
    connected: boolean;
    userId: string;
    syncing: boolean;
    lastSyncedAt: string | null;
  } | null>;
  disconnect(userId: string): Promise<{ ok: true; disconnected: boolean }>;
  isSyncing(userId: string): boolean;
  syncList(
    userId?: string,
    scope?: ListSyncScope,
  ): Promise<Record<string, unknown>>;
};

export type LifecycleConfig<S extends LifecycleService> = {
  provider: string;
  label: string;
  Service: ListProviderClass<S>;
  fetchMock: Mock;
  tokenUrl: string;
  emptyApi: (url: string) => Response;
  animeUrlPart: string;
  mangaUrlPart: string;
  refreshExtras: () => Record<string, string>;
};

export function describeListProviderLifecycle<S extends LifecycleService>(
  cfg: LifecycleConfig<S>,
) {
  const { fetchMock, provider, label, tokenUrl } = cfg;
  const where = (userId: string) => ({
    where: { userId_provider: { userId, provider } },
  });

  describe(`${label} lifecycle`, () => {
    let h: ReturnType<typeof createListProviderHarness<S>>;

    beforeEach(() => {
      fetchMock.mockReset();
      fetchMock.mockImplementation(async (url: unknown) =>
        cfg.emptyApi(String(url)),
      );
      h = createListProviderHarness(cfg.Service);
      vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
      vi.spyOn(Logger.prototype, "debug").mockImplementation(() => undefined);
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    const apiCalls = () =>
      fetchCalls(fetchMock).filter((c) => c.url !== tokenUrl);

    describe("getConnection", () => {
      it("returns null when no user resolves", async () => {
        h.users.resolveUser.mockResolvedValue(null);
        expect(await h.service.getConnection("ghost")).toBeNull();
        expect(h.sourceConnection.findUnique).not.toHaveBeenCalled();
      });

      it("reports a disconnected user", async () => {
        h.sourceConnection.findUnique.mockResolvedValue(null);
        expect(await h.service.getConnection("u-1")).toEqual({
          connected: false,
          userId: "u-1",
          syncing: false,
          lastSyncedAt: null,
        });
      });

      it("serializes lastSyncedAt without exposing tokens", async () => {
        h.sourceConnection.findUnique.mockResolvedValue(
          makeConn({ lastSyncedAt: new Date("2026-01-02T03:04:05.000Z") }),
        );
        const status = await h.service.getConnection("u-1");
        expect(status).toEqual({
          connected: true,
          userId: "u-1",
          syncing: false,
          lastSyncedAt: "2026-01-02T03:04:05.000Z",
        });
        expect(JSON.stringify(status)).not.toContain("stored-token");
      });

      it("scopes the lookup to the resolved user and provider", async () => {
        h.users.resolveUser.mockResolvedValue({ id: "resolved" });
        await h.service.getConnection("requested");
        expect(h.sourceConnection.findUnique).toHaveBeenCalledWith(
          where("resolved"),
        );
      });
    });

    describe("disconnect", () => {
      it("deletes only the caller's row for this provider", async () => {
        expect(await h.service.disconnect("u-1")).toEqual({
          ok: true,
          disconnected: true,
        });
        expect(h.sourceConnection.deleteMany).toHaveBeenCalledWith({
          where: { userId: "u-1", provider },
        });
      });

      it("reports when nothing was connected", async () => {
        h.sourceConnection.deleteMany.mockResolvedValue({ count: 0 });
        expect(await h.service.disconnect("u-1")).toEqual({
          ok: true,
          disconnected: false,
        });
      });

      it("rejects an unknown user without deleting", async () => {
        h.users.resolveUser.mockResolvedValue(null);
        await expect(h.service.disconnect("ghost")).rejects.toBeInstanceOf(
          NotFoundException,
        );
        expect(h.sourceConnection.deleteMany).not.toHaveBeenCalled();
      });
    });

    describe("syncList gating", () => {
      const skipped = { ok: true, skipped: true, accepted: 0, mangaAccepted: 0 };

      it("skips without touching anything when the source is disabled", async () => {
        h.flags.isSourceEnabled.mockResolvedValue(false);
        expect(await h.service.syncList("u-1")).toEqual(skipped);
        expect(h.flags.isSourceEnabled).toHaveBeenCalledWith(provider);
        expect(h.users.resolveUser).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
      });

      it("skips when every requested domain is disabled", async () => {
        h.flags.isDomainEnabled.mockResolvedValue(false);
        expect(await h.service.syncList("u-1")).toEqual(skipped);
        expect(fetchMock).not.toHaveBeenCalled();
      });

      it("skips a read-only sync when the read domain is disabled", async () => {
        h.flags.isDomainEnabled.mockImplementation(
          async (d: string) => d === "watch",
        );
        expect(await h.service.syncList("u-1", "read")).toEqual(skipped);
        expect(fetchMock).not.toHaveBeenCalled();
      });

      it("throws NotFound for an unknown user", async () => {
        h.users.resolveUser.mockResolvedValue(null);
        await expect(h.service.syncList("ghost")).rejects.toBeInstanceOf(
          NotFoundException,
        );
      });

      it("throws BadRequest when not connected and never calls upstream", async () => {
        h.sourceConnection.findUnique.mockResolvedValue(null);
        await expect(h.service.syncList("u-1")).rejects.toBeInstanceOf(
          BadRequestException,
        );
        expect(fetchMock).not.toHaveBeenCalled();
      });

      it.each([
        ["watch", true, false],
        ["read", false, true],
        ["both", true, true],
      ] as const)(
        "scope %s fetches anime=%s manga=%s",
        async (scope, anime, manga) => {
          await h.service.syncList("u-1", scope);
          const urls = apiCalls().map((c) => c.url);
          expect(urls.some((u) => u.includes(cfg.animeUrlPart))).toBe(anime);
          expect(urls.some((u) => u.includes(cfg.mangaUrlPart))).toBe(manga);
        },
      );

      it("drops the half whose domain is disabled on a full sync", async () => {
        h.flags.isDomainEnabled.mockImplementation(
          async (d: string) => d === "read",
        );
        await h.service.syncList("u-1");
        const urls = apiCalls().map((c) => c.url);
        expect(urls.some((u) => u.includes(cfg.animeUrlPart))).toBe(false);
        expect(urls.some((u) => u.includes(cfg.mangaUrlPart))).toBe(true);
      });
    });

    describe("syncList bookkeeping", () => {
      it("returns zero counts and stamps lastSyncedAt on the connection row", async () => {
        const result = await h.service.syncList("u-1");
        expect(result).toEqual({
          ok: true,
          accepted: 0,
          mangaAccepted: 0,
          userId: "u-1",
        });
        const update = h.sourceConnection.update.mock.calls.at(-1)?.[0];
        expect(update.where).toEqual({ id: "conn-1" });
        expect(update.data.lastSyncedAt).toBeInstanceOf(Date);
      });

      it("reads the connection of the resolved user", async () => {
        h.users.resolveUser.mockResolvedValue({ id: "resolved" });
        await h.service.syncList("requested");
        expect(h.sourceConnection.findUnique).toHaveBeenCalledWith(
          where("resolved"),
        );
      });

      it("does not stamp lastSyncedAt and clears syncing when upstream fails", async () => {
        fetchMock.mockImplementation(async () => textRes("boom", 500));
        await expect(h.service.syncList("u-1")).rejects.toThrow(/500 boom/);
        expect(h.sourceConnection.update).not.toHaveBeenCalled();
        expect(h.service.isSyncing("u-1")).toBe(false);
      });

      it("clears syncing when the network rejects", async () => {
        fetchMock.mockRejectedValue(new Error("socket hang up"));
        await expect(h.service.syncList("u-1")).rejects.toThrow("socket hang up");
        expect(h.service.isSyncing("u-1")).toBe(false);
      });

      it("truncates the upstream error body to 200 characters", async () => {
        fetchMock.mockImplementation(async () =>
          textRes("x".repeat(500), 503),
        );
        const err = await h.service.syncList("u-1").catch((e: Error) => e);
        expect((err as Error).message).toContain("x".repeat(200));
        expect((err as Error).message).not.toContain("x".repeat(201));
      });

      it("reports syncing per user while a sync is in flight", async () => {
        let release: () => void = () => undefined;
        const gate = new Promise<void>((r) => {
          release = r;
        });
        fetchMock.mockImplementationOnce(async (url: unknown) => {
          await gate;
          return cfg.emptyApi(String(url));
        });
        const run = h.service.syncList("u-1");
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

        expect(h.service.isSyncing("u-1")).toBe(true);
        expect(h.service.isSyncing("u-2")).toBe(false);
        expect((await h.service.getConnection("u-1"))?.syncing).toBe(true);

        release();
        await run;
        expect(h.service.isSyncing("u-1")).toBe(false);
      });

      it("stays syncing until the last concurrent sync finishes", async () => {
        let release: () => void = () => undefined;
        const gate = new Promise<void>((r) => {
          release = r;
        });
        fetchMock.mockImplementationOnce(async (url: unknown) => {
          await gate;
          return cfg.emptyApi(String(url));
        });
        const slow = h.service.syncList("u-1");
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

        await h.service.syncList("u-1");
        expect(h.service.isSyncing("u-1")).toBe(true);
        expect((await h.service.getConnection("u-1"))?.syncing).toBe(true);

        release();
        await slow;
        expect(h.service.isSyncing("u-1")).toBe(false);
      });
    });

    describe("token refresh", () => {
      const NOW = new Date("2026-06-01T00:00:00.000Z");
      const expiring = (ms: number, extra: Record<string, unknown> = {}) =>
        makeConn({ expiresAt: new Date(NOW.getTime() + ms), ...extra });
      const tokenCalls = () =>
        fetchCalls(fetchMock).filter((c) => c.url === tokenUrl);

      beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(NOW);
      });

      const respondToRefresh = (body: unknown, status = 200) => {
        fetchMock.mockImplementation(async (url: unknown) =>
          String(url) === tokenUrl
            ? jsonRes(body, status)
            : cfg.emptyApi(String(url)),
        );
      };

      it("uses the stored token when no expiry is set", async () => {
        await h.service.syncList("u-1");
        expect(tokenCalls()).toHaveLength(0);
        expect(callHeaders(apiCalls()[0]!).Authorization).toBe(
          "Bearer stored-token",
        );
      });

      it("does not refresh with more than a minute left", async () => {
        h.sourceConnection.findUnique.mockResolvedValue(expiring(61_000));
        await h.service.syncList("u-1");
        expect(tokenCalls()).toHaveLength(0);
      });

      it("refreshes within the one minute skew and uses the new token", async () => {
        h.sourceConnection.findUnique.mockResolvedValue(expiring(59_000));
        respondToRefresh({
          access_token: "fresh",
          refresh_token: "fresh-refresh",
          expires_in: 3600,
        });
        await h.service.syncList("u-1");

        const [refresh] = tokenCalls();
        expect(refresh!.init.method).toBe("POST");
        expect(formBody(refresh!)).toEqual({
          grant_type: "refresh_token",
          refresh_token: "stored-refresh",
          ...cfg.refreshExtras(),
        });
        expect(h.sourceConnection.update).toHaveBeenCalledWith({
          where: { id: "conn-1" },
          data: {
            accessToken: "fresh",
            refreshToken: "fresh-refresh",
            expiresAt: new Date(NOW.getTime() + 3_600_000),
          },
        });
        expect(callHeaders(apiCalls()[0]!).Authorization).toBe("Bearer fresh");
      });

      it("keeps the previous refresh token when rotation omits one", async () => {
        h.sourceConnection.findUnique.mockResolvedValue(expiring(-1000));
        respondToRefresh({ access_token: "fresh" });
        await h.service.syncList("u-1");
        expect(h.sourceConnection.update.mock.calls[0]?.[0].data).toEqual({
          accessToken: "fresh",
          refreshToken: "stored-refresh",
          expiresAt: null,
        });
      });

      it("falls back to the stored token when refresh is rejected", async () => {
        h.sourceConnection.findUnique.mockResolvedValue(expiring(-1000));
        respondToRefresh({ error: "invalid_grant" }, 401);
        await h.service.syncList("u-1");
        expect(h.sourceConnection.update.mock.calls).toHaveLength(1);
        expect(
          h.sourceConnection.update.mock.calls[0]?.[0].data.accessToken,
        ).toBeUndefined();
        expect(callHeaders(apiCalls()[0]!).Authorization).toBe(
          "Bearer stored-token",
        );
      });

      it("keeps the stored token when refresh returns no access token", async () => {
        h.sourceConnection.findUnique.mockResolvedValue(expiring(-1000));
        respondToRefresh({ expires_in: 3600 });
        await h.service.syncList("u-1");
        expect(h.sourceConnection.update.mock.calls).toHaveLength(1);
        expect(
          h.sourceConnection.update.mock.calls[0]?.[0].data,
        ).not.toHaveProperty("expiresAt");
        expect(callHeaders(apiCalls()[0]!).Authorization).toBe(
          "Bearer stored-token",
        );
      });

      it("uses the expired token when no refresh token exists", async () => {
        h.sourceConnection.findUnique.mockResolvedValue(
          expiring(-1000, { refreshToken: null }),
        );
        await h.service.syncList("u-1");
        expect(tokenCalls()).toHaveLength(0);
        expect(callHeaders(apiCalls()[0]!).Authorization).toBe(
          "Bearer stored-token",
        );
      });
    });
  });
}
