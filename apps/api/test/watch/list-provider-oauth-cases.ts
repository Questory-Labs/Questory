import { BadRequestException, Logger, NotFoundException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
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

type OAuthService = {
  configured(): boolean;
  authUrl(state?: string): string;
  exchangeCode(code: string, userId?: string): Promise<unknown>;
  isSyncing(userId: string): boolean;
};

export type OAuthConfig<S extends OAuthService> = {
  provider: string;
  label: string;
  Service: ListProviderClass<S>;
  fetchMock: Mock;
  authorizeBase: string;
  tokenUrl: string;
  envPrefix: string;
  userAgent: string;
};

export function describeListProviderOAuth<S extends OAuthService>(
  cfg: OAuthConfig<S>,
) {
  const { fetchMock, provider, tokenUrl, envPrefix } = cfg;
  const REDIRECT = `https://app.example/${provider}/cb`;
  const key = { userId_provider: { userId: "u-1", provider } };

  describe(`${cfg.label} OAuth`, () => {
    let h: ReturnType<typeof createListProviderHarness<S>>;

    beforeEach(() => {
      fetchMock.mockReset();
      vi.stubEnv(`${envPrefix}_CLIENT_ID`, "cid");
      vi.stubEnv(`${envPrefix}_CLIENT_SECRET`, "csecret");
      vi.stubEnv(`${envPrefix}_REDIRECT_URI`, REDIRECT);
      h = createListProviderHarness(cfg.Service);
      h.sourceConnection.findUnique.mockResolvedValue(makeConn());
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllEnvs();
      vi.restoreAllMocks();
    });

    describe("configured", () => {
      it("requires both id and secret", () => {
        expect(h.service.configured()).toBe(true);
        vi.stubEnv(`${envPrefix}_CLIENT_SECRET`, "");
        expect(h.service.configured()).toBe(false);
        vi.stubEnv(`${envPrefix}_CLIENT_SECRET`, "csecret");
        vi.stubEnv(`${envPrefix}_CLIENT_ID`, "   ");
        expect(h.service.configured()).toBe(false);
      });
    });

    describe("authUrl", () => {
      it("builds the provider authorize URL with state", () => {
        const url = new URL(h.service.authUrl("signed-state"));
        expect(`${url.origin}${url.pathname}`).toBe(cfg.authorizeBase);
        expect(Object.fromEntries(url.searchParams)).toEqual({
          client_id: "cid",
          response_type: "code",
          redirect_uri: REDIRECT,
          state: "signed-state",
        });
      });

      it("omits state when absent", () => {
        expect(new URL(h.service.authUrl()).searchParams.has("state")).toBe(false);
      });

      it("defaults the redirect to the watch callback", () => {
        vi.stubEnv(`${envPrefix}_REDIRECT_URI`, "");
        const redirect = new URL(h.service.authUrl()).searchParams.get(
          "redirect_uri",
        );
        expect(redirect).toMatch(
          new RegExp(`/v1/watch/${provider}/callback$`),
        );
      });

      it("rejects when unconfigured", () => {
        vi.stubEnv(`${envPrefix}_CLIENT_ID`, "");
        expect(() => h.service.authUrl("s")).toThrow(BadRequestException);
      });
    });

    describe("exchangeCode", () => {
      it("rejects when unconfigured before resolving the user or calling upstream", async () => {
        vi.stubEnv(`${envPrefix}_CLIENT_SECRET`, "");
        await expect(h.service.exchangeCode("c", "u-1")).rejects.toBeInstanceOf(
          BadRequestException,
        );
        expect(h.users.resolveUser).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
      });

      it("rejects an unknown user before calling upstream", async () => {
        h.users.resolveUser.mockResolvedValue(null);
        await expect(h.service.exchangeCode("c", "ghost")).rejects.toBeInstanceOf(
          NotFoundException,
        );
        expect(fetchMock).not.toHaveBeenCalled();
      });

      it("posts the authorization code form with a user agent", async () => {
        fetchMock.mockResolvedValue(jsonRes({ access_token: "a" }));
        await h.service.exchangeCode("the-code", "u-1");
        const [call] = fetchCalls(fetchMock);
        expect(call!.url).toBe(tokenUrl);
        expect(call!.init.method).toBe("POST");
        expect(callHeaders(call!)).toEqual({
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": cfg.userAgent,
        });
        expect(formBody(call!)).toEqual({
          grant_type: "authorization_code",
          client_id: "cid",
          client_secret: "csecret",
          code: "the-code",
          redirect_uri: REDIRECT,
        });
      });

      it("stores tokens with a computed expiry for the resolved user", async () => {
        const now = new Date("2026-06-01T00:00:00.000Z");
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(now);
        fetchMock.mockResolvedValue(
          jsonRes({ access_token: "a", refresh_token: "r", expires_in: 60 }),
        );
        const result = await h.service.exchangeCode("c", "u-1");
        const expiresAt = new Date(now.getTime() + 60_000);
        expect(result).toEqual({ ok: true, userId: "u-1" });
        expect(h.sourceConnection.upsert).toHaveBeenCalledWith({
          where: key,
          create: {
            userId: "u-1",
            provider,
            accessToken: "a",
            refreshToken: "r",
            expiresAt,
          },
          update: { accessToken: "a", refreshToken: "r", expiresAt },
        });
      });

      it("keeps the old refresh token on reconnect when none is returned", async () => {
        fetchMock.mockResolvedValue(jsonRes({ access_token: "a" }));
        await h.service.exchangeCode("c", "u-1");
        const args = h.sourceConnection.upsert.mock.calls[0]?.[0];
        expect(args.create.refreshToken).toBeNull();
        expect(args.create.expiresAt).toBeNull();
        expect(args.update.refreshToken).toBeUndefined();
      });

      it("surfaces upstream failure without storing anything", async () => {
        fetchMock.mockResolvedValue(textRes("invalid_grant", 400));
        await expect(h.service.exchangeCode("c", "u-1")).rejects.toThrow(
          /invalid_grant/,
        );
        expect(h.sourceConnection.upsert).not.toHaveBeenCalled();
      });

      it("truncates the upstream failure message to 200 characters", async () => {
        fetchMock.mockResolvedValue(textRes("e".repeat(500), 400));
        const err = (await h.service
          .exchangeCode("c", "u-1")
          .catch((e: unknown) => e)) as BadRequestException;
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.message).toContain("e".repeat(200));
        expect(err.message).not.toContain("e".repeat(201));
      });

      it("rejects a success response with no access token", async () => {
        fetchMock.mockResolvedValue(jsonRes({ refresh_token: "r" }));
        await expect(h.service.exchangeCode("c", "u-1")).rejects.toBeInstanceOf(
          BadRequestException,
        );
        expect(h.sourceConnection.upsert).not.toHaveBeenCalled();
      });

      it("propagates network failure without storing anything", async () => {
        fetchMock.mockRejectedValue(new Error("ETIMEDOUT"));
        await expect(h.service.exchangeCode("c", "u-1")).rejects.toThrow(
          "ETIMEDOUT",
        );
        expect(h.sourceConnection.upsert).not.toHaveBeenCalled();
      });

      it("does not start a sync on reconnect", async () => {
        fetchMock.mockResolvedValue(jsonRes({ access_token: "a" }));
        await h.service.exchangeCode("c", "u-1");
        expect(h.flags.isSourceEnabled).not.toHaveBeenCalled();
      });

      it("starts a background sync on first connect", async () => {
        h.sourceConnection.findUnique.mockResolvedValue(null);
        fetchMock.mockResolvedValue(jsonRes({ access_token: "a" }));
        await h.service.exchangeCode("c", "u-1");
        await vi.waitFor(() =>
          expect(h.flags.isSourceEnabled).toHaveBeenCalledWith(provider),
        );
      });

      it("logs a failed background sync instead of rejecting", async () => {
        const logged = vi
          .spyOn(Logger.prototype, "error")
          .mockImplementation(() => undefined);
        h.sourceConnection.findUnique.mockResolvedValue(null);
        fetchMock.mockResolvedValue(jsonRes({ access_token: "a" }));
        await expect(h.service.exchangeCode("c", "u-1")).resolves.toEqual({
          ok: true,
          userId: "u-1",
        });
        await vi.waitFor(() => expect(logged).toHaveBeenCalled());
        expect(String(logged.mock.calls[0]?.[0])).toMatch(/not connected/);
      });
    });
  });
}
