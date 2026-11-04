import { BadRequestException, HttpException, ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { EnterpriseAiGoalsController } from "../../src/enterprise/enterprise-ai-goals.controller";
import { EnterpriseAiGoalsService } from "../../src/enterprise/enterprise-ai-goals.service";

const ready = { status: "ready", goals: [] };

const build = (opts: { disabled?: string[]; users?: { id: string }[] } = {}) => {
  const proxy = {
    forward: vi.fn().mockResolvedValue(ready),
    forwardPublic: vi.fn().mockResolvedValue({ ok: true }),
  };
  const flags = {
    isDomainEnabled: vi.fn(async (domain: string) => !opts.disabled?.includes(domain)),
  };
  const prisma = {
    user: { findMany: vi.fn().mockResolvedValue(opts.users ?? [{ id: "u1" }]) },
  };
  const service = new EnterpriseAiGoalsService(proxy as never, flags as never, prisma as never);
  return { proxy, flags, prisma, service };
};

describe("EnterpriseAiGoalsService", () => {
  it("sends only enabled domains and never retries a board call", async () => {
    const { proxy, service } = build({ disabled: ["music", "read"] });
    await service.board("u1");
    expect(proxy.forward).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        isAdmin: false,
        path: "/v1/recommendations/goals/ai",
        body: { domains: ["games", "watch"] },
        retries: 0,
      }),
    );
  });

  it("forwards a reroll for the session user", async () => {
    const { proxy, service } = build();
    await service.reroll("u1", "goal:watch:horror:movie");
    expect(proxy.forward).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        path: "/v1/recommendations/goals/ai/reroll",
        body: expect.objectContaining({ itemKey: "goal:watch:horror:movie" }),
      }),
    );
  });

  it("skips the cron run when QEngine is down", async () => {
    const { proxy, prisma, service } = build();
    proxy.forwardPublic.mockRejectedValue(new ServiceUnavailableException());
    const result = await service.refreshBoards();
    expect(result.skipped).toBe("enterprise_unavailable");
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(proxy.forward).not.toHaveBeenCalled();
  });

  it("refreshes one weekly board per user with a bounded query", async () => {
    const { proxy, prisma, service } = build({ users: [{ id: "u1" }, { id: "u2" }] });
    const result = await service.refreshBoards();
    expect(proxy.forward).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ users: 2, boards: 2, noSources: 0, failed: 0 });
    expect(prisma.user.findMany.mock.calls[0][0].take).toBe(200);
  });

  it("counts no_sources users without counting a board", async () => {
    const { proxy, service } = build();
    proxy.forward.mockResolvedValue({ status: "no_sources", goals: [] });
    const result = await service.refreshBoards();
    expect(proxy.forward).toHaveBeenCalledTimes(1);
    expect(result.noSources).toBe(1);
    expect(result.boards).toBe(0);
  });

  it("counts one user's failure and carries on", async () => {
    const { proxy, service } = build({ users: [{ id: "u1" }, { id: "u2" }] });
    proxy.forward.mockRejectedValueOnce(new Error("boom"));
    const result = await service.refreshBoards();
    expect(result.failed).toBe(1);
    expect(result.boards).toBe(1);
  });

  const usersList = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ id: `u${i}` }));
  const unavailable = () => new HttpException("QEngine unavailable", 503);

  it("aborts the run after repeated 503s from the proxy", async () => {
    const { proxy, service } = build({ users: usersList(5) });
    proxy.forward.mockRejectedValue(unavailable());
    const result = await service.refreshBoards();
    expect(proxy.forward).toHaveBeenCalledTimes(3);
    expect(result.failed).toBe(3);
    expect(result.skipped).toBe("enterprise_unavailable");
  });

  it("keeps going after a lone 503", async () => {
    const { proxy, service } = build({ users: usersList(5) });
    proxy.forward
      .mockRejectedValueOnce(unavailable())
      .mockRejectedValueOnce(unavailable())
      .mockResolvedValueOnce(ready)
      .mockRejectedValueOnce(unavailable())
      .mockRejectedValueOnce(unavailable());
    const result = await service.refreshBoards();
    expect(proxy.forward).toHaveBeenCalledTimes(5);
    expect(result.failed).toBe(4);
    expect(result.boards).toBe(1);
    expect(result.skipped).toBeUndefined();
  });
});

describe("EnterpriseAiGoalsController", () => {
  const build = () => {
    const aiGoals = { board: vi.fn().mockResolvedValue(ready), reroll: vi.fn().mockResolvedValue(ready) };
    const rateLimit = { assertAllowed: vi.fn().mockResolvedValue(undefined) };
    const controller = new EnterpriseAiGoalsController(aiGoals as never, rateLimit as never);
    return { aiGoals, rateLimit, controller };
  };
  const user = { userId: "u1" } as never;

  it("rejects a reroll with an oversized key", async () => {
    const { aiGoals, controller } = build();
    await expect(
      controller.reroll(user, { itemKey: "x".repeat(201) }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(aiGoals.reroll).not.toHaveBeenCalled();
  });

  it("charges boards to recommendations and rerolls to llm", async () => {
    const { aiGoals, rateLimit, controller } = build();
    await controller.board(user);
    expect(rateLimit.assertAllowed).toHaveBeenLastCalledWith("u1", "recommendations");
    await controller.reroll(user, { itemKey: "goal:a" });
    expect(rateLimit.assertAllowed).toHaveBeenLastCalledWith("u1", "llm");
    expect(aiGoals.reroll).toHaveBeenCalledWith("u1", "goal:a");
  });
});
