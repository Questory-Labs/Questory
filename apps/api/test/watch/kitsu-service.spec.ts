import { BadRequestException, Logger, NotFoundException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KitsuService } from "../../src/watch/kitsu/kitsu.service";
import {
  callHeaders,
  createListProviderHarness,
  fetchCalls,
  formBody,
  jsonRes,
  makeConn,
  textRes,
} from "./list-provider-harness";
import { describeListProviderLifecycle } from "./list-provider-lifecycle-cases";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock("../../src/watch/lib/provider-fetch", () => ({
  providerFetch: fetchMock,
}));

const TOKEN_URL = "https://kitsu.io/api/oauth/token";

describeListProviderLifecycle({
  provider: "kitsu",
  label: "Kitsu",
  Service: KitsuService,
  fetchMock,
  tokenUrl: TOKEN_URL,
  emptyApi: (url) =>
    url.includes("/users?")
      ? jsonRes({ data: [{ id: "9" }] })
      : jsonRes({ data: [] }),
  animeUrlPart: "filter[kind]=anime",
  mangaUrlPart: "filter[kind]=manga",
  refreshExtras: () => ({}),
});

describe("KitsuService.connect", () => {
  let h: ReturnType<typeof createListProviderHarness<KitsuService>>;
  const key = { userId_provider: { userId: "u-1", provider: "kitsu" } };

  beforeEach(() => {
    fetchMock.mockReset();
    h = createListProviderHarness(KitsuService);
    h.sourceConnection.findUnique.mockResolvedValue(makeConn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("is always configured because it needs no client credentials", () => {
    expect(h.service.configured()).toBe(true);
  });

  it("rejects an unknown user before validating or calling upstream", async () => {
    h.users.resolveUser.mockResolvedValue(null);
    await expect(h.service.connect("", "", "ghost")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["empty email", "", "pw"],
    ["blank email", "   ", "pw"],
    ["empty password", "a@b.c", ""],
  ])("rejects %s without calling upstream", async (_n, email, password) => {
    await expect(
      h.service.connect(email, password, "u-1"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(h.sourceConnection.upsert).not.toHaveBeenCalled();
  });

  it("posts a password grant with a trimmed email and untouched password", async () => {
    fetchMock.mockResolvedValue(jsonRes({ access_token: "a" }));
    await h.service.connect("  a@b.c ", " p w ", "u-1");
    const [call] = fetchCalls(fetchMock);
    expect(call!.url).toBe(TOKEN_URL);
    expect(call!.init.method).toBe("POST");
    expect(callHeaders(call!)["Content-Type"]).toBe(
      "application/x-www-form-urlencoded",
    );
    expect(formBody(call!)).toEqual({
      grant_type: "password",
      username: "a@b.c",
      password: " p w ",
    });
  });

  it("stores tokens with expiry for the resolved user and never returns them", async () => {
    const now = new Date("2026-06-01T00:00:00.000Z");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    fetchMock.mockResolvedValue(
      jsonRes({ access_token: "a", refresh_token: "r", expires_in: 120 }),
    );
    const result = await h.service.connect("a@b.c", "pw", "u-1");
    const expiresAt = new Date(now.getTime() + 120_000);
    expect(result).toEqual({ ok: true, userId: "u-1" });
    expect(h.sourceConnection.upsert).toHaveBeenCalledWith({
      where: key,
      create: {
        userId: "u-1",
        provider: "kitsu",
        accessToken: "a",
        refreshToken: "r",
        expiresAt,
      },
      update: { accessToken: "a", refreshToken: "r", expiresAt },
    });
  });

  it("does not persist the password", async () => {
    fetchMock.mockResolvedValue(jsonRes({ access_token: "a" }));
    await h.service.connect("a@b.c", "hunter2", "u-1");
    expect(JSON.stringify(h.sourceConnection.upsert.mock.calls)).not.toContain(
      "hunter2",
    );
  });

  it("keeps the old refresh token on reconnect when none is returned", async () => {
    fetchMock.mockResolvedValue(jsonRes({ access_token: "a" }));
    await h.service.connect("a@b.c", "pw", "u-1");
    const args = h.sourceConnection.upsert.mock.calls[0]?.[0];
    expect(args.create.refreshToken).toBeNull();
    expect(args.create.expiresAt).toBeNull();
    expect(args.update.refreshToken).toBeUndefined();
  });

  it("rejects bad credentials with a truncated upstream message", async () => {
    fetchMock.mockResolvedValue(textRes("e".repeat(500), 401));
    const err = (await h.service
      .connect("a@b.c", "pw", "u-1")
      .catch((e: unknown) => e)) as BadRequestException;
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.message).toContain("e".repeat(200));
    expect(err.message).not.toContain("e".repeat(201));
    expect(h.sourceConnection.upsert).not.toHaveBeenCalled();
  });

  it("rejects a success response with no access token", async () => {
    fetchMock.mockResolvedValue(jsonRes({ refresh_token: "r" }));
    await expect(
      h.service.connect("a@b.c", "pw", "u-1"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(h.sourceConnection.upsert).not.toHaveBeenCalled();
  });

  it("propagates network failure without storing anything", async () => {
    fetchMock.mockRejectedValue(new Error("ETIMEDOUT"));
    await expect(h.service.connect("a@b.c", "pw", "u-1")).rejects.toThrow(
      "ETIMEDOUT",
    );
    expect(h.sourceConnection.upsert).not.toHaveBeenCalled();
  });

  it("does not start a sync on reconnect", async () => {
    fetchMock.mockResolvedValue(jsonRes({ access_token: "a" }));
    await h.service.connect("a@b.c", "pw", "u-1");
    expect(h.flags.isSourceEnabled).not.toHaveBeenCalled();
  });

  it("starts a background sync on first connect", async () => {
    h.sourceConnection.findUnique.mockResolvedValue(null);
    fetchMock.mockResolvedValue(jsonRes({ access_token: "a" }));
    await h.service.connect("a@b.c", "pw", "u-1");
    await vi.waitFor(() =>
      expect(h.flags.isSourceEnabled).toHaveBeenCalledWith("kitsu"),
    );
  });

  it("logs a failed background sync instead of rejecting", async () => {
    const logged = vi
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
    h.sourceConnection.findUnique.mockResolvedValue(null);
    fetchMock.mockResolvedValue(jsonRes({ access_token: "a" }));
    await expect(h.service.connect("a@b.c", "pw", "u-1")).resolves.toEqual({
      ok: true,
      userId: "u-1",
    });
    await vi.waitFor(() => expect(logged).toHaveBeenCalled());
    expect(String(logged.mock.calls[0]?.[0])).toMatch(/not connected/);
  });
});
