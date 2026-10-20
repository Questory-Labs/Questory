import { BadRequestException } from "@nestjs/common";
import { RewindPeriodQuerySchema } from "@questorylabs/shared";
import { parseRewindTimeZone } from "../lib/rewind-stats";

export type RewindQuery = { period: string; timeZone: string; forceRedo: boolean };

export function parseRewindQuery(query: {
  period?: unknown;
  tz?: unknown;
  forceRedo?: unknown;
}): RewindQuery {
  const parsed = RewindPeriodQuerySchema.shape.period.safeParse(query.period);
  if (!parsed.success) {
    throw new BadRequestException("period must be YYYY or YYYY-MM");
  }
  const month = parsed.data.length === 7 ? Number(parsed.data.slice(5)) : 1;
  if (month < 1 || month > 12) {
    throw new BadRequestException("period must be YYYY or YYYY-MM");
  }
  if (query.tz !== undefined && typeof query.tz !== "string") {
    throw new BadRequestException("tz must be a valid IANA time zone");
  }
  return {
    period: parsed.data,
    timeZone: parseRewindTimeZone(query.tz as string | undefined),
    forceRedo: query.forceRedo === "true",
  };
}
