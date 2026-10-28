import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  Goal,
  GoalCreate,
  GoalListQuery,
  GoalUpdate,
} from "@questorylabs/shared";
import type { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { parseTimeZone } from "../lib/timezone";
import { goalPeriod } from "./goals.period";

type GoalRow = {
  id: string;
  domain: string;
  kind: string;
  name: string;
  targetRef: string | null;
  targetValue: number | null;
  progressValue: number;
  estimatedMinutes: number | null;
  timeframe: string;
  periodStart: Date;
  periodEnd: Date;
  acceptedAt: Date;
  doneAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    domain: row.domain as Goal["domain"],
    kind: row.kind,
    name: row.name,
    targetRef: row.targetRef,
    targetValue: row.targetValue,
    progressValue: row.progressValue,
    estimatedMinutes: row.estimatedMinutes,
    timeframe: row.timeframe as Goal["timeframe"],
    periodStart: row.periodStart.toISOString(),
    periodEnd: row.periodEnd.toISOString(),
    acceptedAt: row.acceptedAt.toISOString(),
    doneAt: row.doneAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: GoalListQuery, now = new Date()) {
    const where: Prisma.GoalWhereInput = { userId };
    if (query.domain) where.domain = query.domain;
    if (query.timeframe) where.timeframe = query.timeframe;
    if (query.status === "active") {
      where.doneAt = null;
      where.periodEnd = { gt: now };
    } else if (query.status === "done") {
      where.doneAt = { not: null };
    }
    const rows = await this.prisma.goal.findMany({
      where,
      orderBy: [{ periodStart: "desc" }, { acceptedAt: "desc" }],
      take: query.limit,
    });
    return { items: rows.map(toGoal) };
  }

  async create(userId: string, input: GoalCreate, now = new Date()): Promise<Goal> {
    const { start, end } = goalPeriod(input.timeframe, parseTimeZone(input.tz), now);
    if (input.targetRef) {
      const existing = await this.prisma.goal.findFirst({
        where: {
          userId,
          domain: input.domain,
          kind: input.kind,
          targetRef: input.targetRef,
          timeframe: input.timeframe,
          periodStart: start,
        },
      });
      if (existing) return toGoal(existing);
    }
    const row = await this.prisma.goal.create({
      data: {
        userId,
        domain: input.domain,
        kind: input.kind,
        name: input.name,
        targetRef: input.targetRef ?? null,
        targetValue: input.targetValue ?? null,
        estimatedMinutes: input.estimatedMinutes ?? null,
        timeframe: input.timeframe,
        periodStart: start,
        periodEnd: end,
        acceptedAt: now,
      },
    });
    return toGoal(row);
  }

  async update(
    userId: string,
    id: string,
    input: GoalUpdate,
    now = new Date(),
  ): Promise<Goal> {
    const existing = await this.prisma.goal.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Goal not found");
    const row = await this.prisma.goal.update({
      where: { id: existing.id },
      data: {
        ...(input.done !== undefined ? { doneAt: input.done ? now : null } : {}),
        ...(input.progressValue !== undefined
          ? { progressValue: input.progressValue }
          : {}),
      },
    });
    return toGoal(row);
  }

  async remove(userId: string, id: string): Promise<{ ok: true }> {
    const result = await this.prisma.goal.deleteMany({ where: { id, userId } });
    if (result.count === 0) throw new NotFoundException("Goal not found");
    return { ok: true };
  }
}
