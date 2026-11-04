import { zonedParts } from "../lib/timezone";
import { zonedMidnight } from "../lib/rewind-stats";

export function goalPeriod(
  timeZone: string,
  now = new Date(),
): { start: Date; end: Date } {
  const p = zonedParts(now, timeZone);
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
