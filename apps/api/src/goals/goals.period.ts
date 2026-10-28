import type { GoalTimeframe } from "@questorylabs/shared";
import { zonedParts } from "../lib/timezone";
import { zonedMidnight } from "../lib/rewind-stats";

export function goalPeriod(
  timeframe: GoalTimeframe,
  timeZone: string,
  now = new Date(),
): { start: Date; end: Date } {
  const p = zonedParts(now, timeZone);
  if (timeframe === "year") {
    return {
      start: zonedMidnight(p.year, 1, 1, timeZone),
      end: zonedMidnight(p.year + 1, 1, 1, timeZone),
    };
  }
  if (timeframe === "month") {
    return {
      start: zonedMidnight(p.year, p.month, 1, timeZone),
      end:
        p.month === 12
          ? zonedMidnight(p.year + 1, 1, 1, timeZone)
          : zonedMidnight(p.year, p.month + 1, 1, timeZone),
    };
  }
  const offset = (p.weekday + 6) % 7;
  const monday = new Date(Date.UTC(p.year, p.month - 1, p.day - offset));
  const nextMonday = new Date(Date.UTC(p.year, p.month - 1, p.day - offset + 7));
  return {
    start: zonedMidnight(
      monday.getUTCFullYear(),
      monday.getUTCMonth() + 1,
      monday.getUTCDate(),
      timeZone,
    ),
    end: zonedMidnight(
      nextMonday.getUTCFullYear(),
      nextMonday.getUTCMonth() + 1,
      nextMonday.getUTCDate(),
      timeZone,
    ),
  };
}
