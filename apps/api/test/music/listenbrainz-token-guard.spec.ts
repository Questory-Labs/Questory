import { UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashToken } from "../../src/music/lib/tokens";
import {
  TokenGuard,
  extractToken,
  type AuthedRequest,
} from "../../src/music/listenbrainz/token.guard";
import { UsersService } from "../../src/music/users/users.service";

function reqWith(authorization?: string, query: Record<string, string> = {}) {
  return {
    headers: authorization === undefined ? {} : { authorization },
    query,
  } as unknown as AuthedRequest;
}

function ctx(req: AuthedRequest) {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe("extractToken", () => {
  it.each([
    ["Token abc123", "abc123"],
    ["token abc123", "abc123"],
    ["TOKEN abc123", "abc123"],
    ["Token    abc123", "abc123"],
    ["  Token abc123  ", "abc123"],
  ])("reads %j", (header, expected) => {
    expect(extractToken(reqWith(header))).toBe(expected);
  });

  it.each([
    "Bearer abc123",
    "Basic YWJjOmRlZg==",
    "abc123",
    "Token",
    "Token ",
    "Tokenabc123",
    "",
  ])("rejects %j", (header) => {
    expect(extractToken(reqWith(header))).toBeNull();
  });

  it("ignores query-string tokens", () => {
    expect(extractToken(reqWith(undefined, { token: "abc123" }))).toBeNull();
  });

  it("does not fall back to the query when the header scheme is wrong", () => {
    expect(extractToken(reqWith("Bearer x", { token: "abc123" }))).toBeNull();
  });
});

describe("TokenGuard", () => {
  const findByTokenHash = vi.fn();
  let guard: TokenGuard;

  beforeEach(() => {
    findByTokenHash.mockReset();
    guard = new TokenGuard({ findByTokenHash } as never);
  });

  it("looks up the sha256 hash, never the plaintext token", async () => {
    findByTokenHash.mockResolvedValue({ id: "u1", username: "rj" });
    await guard.canActivate(ctx(reqWith("Token secret-value")));
    expect(findByTokenHash).toHaveBeenCalledTimes(1);
    expect(findByTokenHash).toHaveBeenCalledWith(hashToken("secret-value"));
    expect(findByTokenHash).not.toHaveBeenCalledWith("secret-value");
  });

  it("attaches only id and username to the request", async () => {
    findByTokenHash.mockResolvedValue({
      id: "u1",
      username: "rj",
      personaName: "RJ",
    });
    const req = reqWith("Token good");
    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
    expect(req.musicUser).toEqual({ id: "u1", username: "rj" });
  });

  it("401s without a token and skips the lookup", async () => {
    await expect(guard.canActivate(ctx(reqWith()))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(findByTokenHash).not.toHaveBeenCalled();
  });

  it("401s a query-string token and skips the lookup", async () => {
    await expect(
      guard.canActivate(ctx(reqWith(undefined, { token: "good" }))),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findByTokenHash).not.toHaveBeenCalled();
  });

  it("401s an unknown token with the ListenBrainz error body", async () => {
    findByTokenHash.mockResolvedValue(null);
    const req = reqWith("Token nope");
    const err = await guard.canActivate(ctx(req)).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UnauthorizedException);
    expect((err as UnauthorizedException).getResponse()).toEqual({
      code: 401,
      error: "Invalid authorization token supplied",
    });
    expect(req.musicUser).toBeUndefined();
  });

  it("does not turn a lookup failure into an authenticated request", async () => {
    findByTokenHash.mockRejectedValue(new Error("db down"));
    const req = reqWith("Token good");
    await expect(guard.canActivate(ctx(req))).rejects.toThrow("db down");
    expect(req.musicUser).toBeUndefined();
  });
});

describe("music UsersService.findByTokenHash", () => {
  const findFirst = vi.fn();
  const update = vi.fn();
  const accountFindFirst = vi.fn();
  let users: UsersService;

  beforeEach(() => {
    findFirst.mockReset();
    update.mockReset();
    accountFindFirst.mockReset();
    users = new UsersService({
      apiKey: { findFirst, update },
      account: { findFirst: accountFindFirst },
    } as never);
  });

  it("only matches active music_ingest keys", async () => {
    findFirst.mockResolvedValue(null);
    await expect(users.findByTokenHash("hash")).resolves.toBeNull();
    expect(findFirst).toHaveBeenCalledWith({
      where: { tokenHash: "hash", type: "music_ingest", revokedAt: null },
      include: { user: true },
    });
  });

  it("does not stamp lastUsedAt when nothing matched", async () => {
    findFirst.mockResolvedValue(null);
    await users.findByTokenHash("hash");
    expect(update).not.toHaveBeenCalled();
  });

  it("stamps lastUsedAt on the matched key and returns the LB username", async () => {
    findFirst.mockResolvedValue({
      id: "k1",
      userId: "u1",
      user: { id: "u1", personaName: "Persona" },
    });
    accountFindFirst.mockResolvedValue({ providerAccountId: "lb-name" });
    await expect(users.findByTokenHash("hash")).resolves.toEqual({
      id: "u1",
      personaName: "Persona",
      username: "lb-name",
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "k1" },
      data: { lastUsedAt: expect.any(Date) },
    });
  });

  it("falls back to personaName without a ListenBrainz account", async () => {
    findFirst.mockResolvedValue({
      id: "k1",
      userId: "u1",
      user: { id: "u1", personaName: "Persona" },
    });
    accountFindFirst.mockResolvedValue(null);
    const user = await users.findByTokenHash("hash");
    expect(user?.username).toBe("Persona");
  });

  it("scopes the account lookup to the listenbrainz provider", async () => {
    accountFindFirst.mockResolvedValue(null);
    await users.getListenbrainzUsername("u1");
    expect(accountFindFirst).toHaveBeenCalledWith({
      where: { userId: "u1", provider: "listenbrainz" },
      select: { providerAccountId: true },
    });
  });
});
