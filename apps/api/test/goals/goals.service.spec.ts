import { describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { GoalsService } from "../../src/goals/goals.service";
import { goalPeriod } from "../../src/goals/goals.period";
import type { PrismaService } from "../../src/prisma/prisma.service";

const now = new Date("2026-10-28T12:00:00.000Z");

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "g1",
    userId: "u1",
    domain: "games",
    kind: "game",
    name: "Hades",
    targetRef: "game:1",
    targetValue: null,
    progressValue: 0,
    estimatedMinutes: 600,
    timeframe: "month",
    periodStart: new Date("2026-10-01T00:00:00.000Z"),
    periodEnd: new Date("2026-11-01T00:00:00.000Z"),
    acceptedAt: now,
    doneAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function make() {
  const goal = {
    findMany: vi.fn().mockResolvedValue([row()]),
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation(async ({ data }) => row(data)),
    update: vi.fn().mockImplementation(async ({ data }) => row(data)),
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
  };
  const service = new GoalsService({ goal } as unknown as PrismaService);
  return { service, goal };
}

describe("goalPeriod", () => {
  it("computes week, month and year bounds in the requested zone", () => {
    expect(goalPeriod("week", "UTC", now)).toEqual({
      start: new Date("2026-10-26T00:00:00.000Z"),
      end: new Date("2026-11-02T00:00:00.000Z"),
    });
    expect(goalPeriod("month", "Asia/Kolkata", now)).toEqual({
      start: new Date("2026-09-30T18:30:00.000Z"),
      end: new Date("2026-10-31T18:30:00.000Z"),
    });
    expect(goalPeriod("year", "UTC", now)).toEqual({
      start: new Date("2026-01-01T00:00:00.000Z"),
      end: new Date("2027-01-01T00:00:00.000Z"),
    });
  });
});

describe("GoalsService", () => {
  it("lists active goals scoped to the caller with a bound", async () => {
    const { service, goal } = make();
    const out = await service.list(
      "u1",
      { status: "active", domain: "music", limit: 20 },
      now,
    );
    expect(goal.findMany.mock.calls[0]![0]).toMatchObject({
      where: { userId: "u1", domain: "music", doneAt: null, periodEnd: { gt: now } },
      take: 20,
    });
    expect(out.items[0]!.periodStart).toBe("2026-10-01T00:00:00.000Z");
  });

  it("lists done goals", async () => {
    const { service, goal } = make();
    await service.list("u1", { status: "done", limit: 50 }, now);
    expect(goal.findMany.mock.calls[0]![0].where).toEqual({
      userId: "u1",
      doneAt: { not: null },
    });
  });

  it("creates a goal with a computed period", async () => {
    const { service, goal } = make();
    const out = await service.create(
      "u1",
      {
        kind: "daily_listens",
        name: "Listen daily",
        domain: "music",
        targetValue: 20,
        timeframe: "week",
      },
      now,
    );
    expect(goal.create.mock.calls[0]![0].data).toMatchObject({
      userId: "u1",
      kind: "daily_listens",
      targetValue: 20,
      periodStart: new Date("2026-10-26T00:00:00.000Z"),
      periodEnd: new Date("2026-11-02T00:00:00.000Z"),
    });
    expect(out.kind).toBe("daily_listens");
  });

  it("returns the existing goal when the same suggestion is accepted twice", async () => {
    const { service, goal } = make();
    goal.findFirst.mockResolvedValue(row({ id: "existing" }));
    const out = await service.create(
      "u1",
      { kind: "game", name: "Hades", domain: "games", targetRef: "game:1", timeframe: "month" },
      now,
    );
    expect(out.id).toBe("existing");
    expect(goal.create).not.toHaveBeenCalled();
    expect(goal.findFirst.mock.calls[0]![0].where).toMatchObject({
      timeframe: "month",
      targetRef: "game:1",
    });
  });

  it("checks off and undoes only the caller goal", async () => {
    const { service, goal } = make();
    goal.findFirst.mockResolvedValue({ id: "g1" });
    const done = await service.update("u1", "g1", { done: true }, now);
    expect(goal.findFirst.mock.calls[0]![0].where).toEqual({ id: "g1", userId: "u1" });
    expect(done.doneAt).toBe(now.toISOString());
    const undone = await service.update("u1", "g1", { done: false }, now);
    expect(undone.doneAt).toBeNull();
    await service.update("u1", "g1", { progressValue: 3 }, now);
    expect(goal.update.mock.calls[2]![0].data).toEqual({ progressValue: 3 });
  });

  it("404s when updating or deleting another user goal", async () => {
    const { service, goal } = make();
    await expect(service.update("u2", "g1", { done: true }, now)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    goal.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.remove("u2", "g1")).rejects.toBeInstanceOf(NotFoundException);
    expect(goal.deleteMany.mock.calls[0]![0].where).toEqual({ id: "g1", userId: "u2" });
  });
});
