import { ForbiddenException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListenBrainzNativeMutexGuard } from "../../src/music/scrobbler/listenbrainz-native-mutex.guard";
import { LB_NATIVE_DISABLED_ERROR } from "../../src/music/scrobbler/scrobbler.constants";

function httpCtx(req: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as ExecutionContext;
}

describe("ListenBrainzNativeMutexGuard", () => {
  const hasNative = vi.fn();
  const findByUsername = vi.fn();
  const findByTokenHash = vi.fn();
  let guard: ListenBrainzNativeMutexGuard;

  beforeEach(() => {
    hasNative.mockReset();
    findByUsername.mockReset();
    findByTokenHash.mockReset();
    guard = new ListenBrainzNativeMutexGuard(
      { hasNative } as never,
      { findByUsername, findByTokenHash } as never,
    );
  });

  it("allows requests when the user has no native scrobbler", async () => {
    findByUsername.mockResolvedValue({ id: "u1" });
    hasNative.mockResolvedValue(false);
    await expect(
      guard.canActivate(httpCtx({ params: { user: "santosh" } })),
    ).resolves.toBe(true);
  });

  it("rejects username routes when native scrobbling is on", async () => {
    findByUsername.mockResolvedValue({ id: "u1" });
    hasNative.mockResolvedValue(true);
    await expect(
      guard.canActivate(httpCtx({ params: { user: "santosh" } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    try {
      await guard.canActivate(httpCtx({ params: { user: "santosh" } }));
    } catch (err) {
      expect((err as ForbiddenException).getResponse()).toEqual({
        code: 403,
        error: LB_NATIVE_DISABLED_ERROR,
      });
    }
  });

  it("rejects token routes when native scrobbling is on", async () => {
    findByTokenHash.mockResolvedValue({ id: "u1" });
    hasNative.mockResolvedValue(true);
    await expect(
      guard.canActivate(
        httpCtx({
          headers: { authorization: "Token abc" },
          params: {},
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows validate-token with no user (invalid/missing token)", async () => {
    await expect(
      guard.canActivate(httpCtx({ headers: {}, params: {} })),
    ).resolves.toBe(true);
  });
});
