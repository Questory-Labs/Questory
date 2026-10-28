import { describe, expect, it, vi } from "vitest";
import {
  MonthlyRecapService,
  monthLabel,
  previousMonthPeriod,
  RECAP_USER_PREFIX,
} from "../../src/recap/monthly-recap.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { FeatureFlagsService } from "../../src/features/feature-flags.service";
import type { RewindAiService } from "../../src/rewind/rewind-ai.service";

type Opts = {
  global?: boolean;
  optedIn?: string[];
  optedOut?: string[];
  users?: string[];
  existingNotice?: boolean;
  serveFails?: boolean;
  musicPlays?: number;
  monthlyListens?: Record<string, number>;
};

function make(opts: Opts) {
  const notificationCreate = vi.fn().mockResolvedValue({});
  const prisma = {
    appConfig: {
      findUnique: vi.fn().mockImplementation(async ({ where }: { where: { key: string } }) =>
        where.key === "recap.monthly.enabled" && opts.global ? { value: "true" } : null,
      ),
      findMany: vi.fn().mockImplementation(async ({ where }: { where: { value: string } }) =>
        (where.value === "true" ? (opts.optedIn ?? []) : (opts.optedOut ?? [])).map((id) => ({
          key: `${RECAP_USER_PREFIX}${id}`,
        })),
      ),
      upsert: vi.fn().mockResolvedValue({}),
    },
    user: {
      findMany: vi
        .fn()
        .mockImplementation(async (args: { cursor?: unknown }) =>
          args.cursor ? [] : (opts.users ?? []).map((id) => ({ id })),
        ),
    },
    notification: {
      findFirst: vi.fn().mockResolvedValue(opts.existingNotice ? { id: "n" } : null),
      create: notificationCreate,
    },
    listen: {
      count: vi
        .fn()
        .mockImplementation(async ({ where }: { where: { listenedAt: { gte: Date } } }) => {
          const key = where.listenedAt.gte.toISOString().slice(0, 7);
          return opts.monthlyListens?.[key] ?? 0;
        }),
    },
    playSession: { count: vi.fn().mockResolvedValue(0) },
  } as unknown as PrismaService;
  const flags = {
    isDomainEnabled: vi.fn().mockImplementation(async (d: string) => d === "music"),
  } as unknown as FeatureFlagsService;
  const serve = opts.serveFails
    ? vi.fn().mockRejectedValue(new Error("qengine down"))
    : vi.fn().mockResolvedValue({ content: "x" });
  const rewindAi = { serve } as unknown as RewindAiService;
  const music = {
    rewindStats: vi.fn().mockResolvedValue({
      domain: "music",
      period: "2026-09",
      totalPlays: opts.musicPlays ?? 10,
      monthly: [
        { month: "2026-09-01", count: 4 },
        { month: "2026-09-02", count: 6 },
      ],
    }),
  };
  const games = {
    rewindStats: vi.fn().mockResolvedValue({
      domain: "games",
      period: "2026-09",
      totalMinutes: 0,
      sessions: 0,
    }),
  };
  const service = new MonthlyRecapService(
    prisma,
    flags,
    rewindAi,
    music as never,
    {} as never,
    {} as never,
    games as never,
  );
  return { service, serve, notificationCreate, music };
}

describe("monthly recap", () => {
  it("steps back one month across a year edge", () => {
    expect(previousMonthPeriod(new Date("2026-01-01T06:00:00Z"))).toBe("2025-12");
    expect(previousMonthPeriod(new Date("2026-10-01T06:00:00Z"))).toBe("2026-09");
    expect(monthLabel("2026-09")).toBe("September");
  });

  it("prefills active domains for opted-in users and notifies once", async () => {
    const { service, serve, notificationCreate } = make({ optedIn: ["u1"] });
    const result = await service.run(new Date("2026-10-01T06:00:00Z"));
    expect(result).toMatchObject({ period: "2026-09", users: 1, generated: 1, notified: 1 });
    expect(serve).toHaveBeenCalledTimes(1);
    expect(serve.mock.calls[0][0]).toMatchObject({ userId: "u1", domain: "music", period: "2026-09", forceRedo: false });
    expect(notificationCreate.mock.calls[0][0].data).toMatchObject({
      userId: "u1",
      type: "monthly-recap",
      title: "Your September recap is ready",
      href: "/music/rewind",
    });
  });

  it("skips inactive users and existing notices", async () => {
    const idle = make({ optedIn: ["u1"], musicPlays: 0 });
    expect((await idle.service.run(new Date("2026-10-01T06:00:00Z"))).generated).toBe(0);
    expect(idle.notificationCreate).not.toHaveBeenCalled();
    const dup = make({ optedIn: ["u1"], existingNotice: true });
    expect((await dup.service.run(new Date("2026-10-01T06:00:00Z"))).notified).toBe(0);
    expect(dup.notificationCreate).not.toHaveBeenCalled();
  });

  it("global mode covers every user except explicit opt-outs", async () => {
    const { service, music } = make({ global: true, users: ["u1", "u2", "u3"], optedOut: ["u2"] });
    const result = await service.run(new Date("2026-10-01T06:00:00Z"));
    expect(result.users).toBe(2);
    expect(music.rewindStats.mock.calls.map((c) => c[0])).toEqual(["u1", "u3"]);
  });

  it("combines only enabled, active areas for the unified rewind", async () => {
    const { service, music } = make({});
    const combined = await service.combinedStats("u1", "2026-09", "Asia/Kolkata");
    expect(combined.domain).toBe("all");
    expect(Object.keys(combined.domains)).toEqual(["music"]);
    expect(music.rewindStats).toHaveBeenCalledWith("u1", "2026-09", "Asia/Kolkata");
    expect(combined.daily).toEqual([
      { date: "2026-09-01", counts: { music: 4 } },
      { date: "2026-09-02", counts: { music: 6 } },
    ]);
  });

  it("reports the most recent busier month for the unified rewind", async () => {
    const { service } = make({
      monthlyListens: { "2026-09": 50, "2026-08": 20, "2026-07": 30, "2026-06": 80 },
    });
    const combined = await service.combinedStats("u1", "2026-09", "UTC");
    expect(combined.busiestSince).toBe("2026-06");
  });

  it("names the oldest month checked when the current month beats the whole lookback", async () => {
    const { service } = make({
      monthlyListens: { "2026-09": 50, "2026-08": 20, "2026-07": 30 },
    });
    const combined = await service.combinedStats("u1", "2026-09", "UTC");
    expect(combined.busiestSince).toMatch(/^\d{4}-\d{2}$/);
    expect(combined.busiestSince! < "2026-07").toBe(true);
  });

  it("omits busiest-since when the previous month was busier", async () => {
    const { service } = make({ monthlyListens: { "2026-09": 10, "2026-08": 20 } });
    const combined = await service.combinedStats("u1", "2026-09", "UTC");
    expect(combined.busiestSince).toBeNull();
  });

  it("aborts after repeated generation failures", async () => {
    const { service, notificationCreate } = make({ optedIn: ["u1", "u2", "u3", "u4"], serveFails: true });
    const result = await service.run(new Date("2026-10-01T06:00:00Z"));
    expect(result.aborted).toBe(true);
    expect(result.failed).toBe(3);
    expect(notificationCreate).not.toHaveBeenCalled();
  });

  it("refuses a second run while one is in flight", async () => {
    const { service } = make({ optedIn: ["u1"] });
    const first = service.run(new Date("2026-10-01T06:00:00Z"));
    expect(service.running).toBe(true);
    expect(() => service.run(new Date("2026-10-01T06:00:00Z"))).toThrow("already running");
    await first;
    expect(service.running).toBe(false);
  });
});
