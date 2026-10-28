import { relativeTime } from "../jobs/admin.jobs.utils";
import type { MigrationItem } from "./admin.migrations.types";

export const statusLabel = (status: string) => {
  switch (status) {
    case "not_run":
      return "Not run";
    case "running":
      return "Running";
    case "completed":
      return "Done";
    case "failed":
      return "Failed";
    default:
      return status;
  }
};

export const parseResult = (
  raw: string | null,
): Record<string, unknown> | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const migrationMeta = (
  m: Pick<
    MigrationItem,
    "runCount" | "lastStartedAt" | "lastCompletedAt" | "lastFailedAt" | "status"
  >,
  now = Date.now(),
) => {
  const parts = [`Runs ${m.runCount}`];
  if (m.lastStartedAt) parts.push(`started ${relativeTime(m.lastStartedAt, now)}`);
  if (m.status === "failed" && m.lastFailedAt) {
    parts.push(`failed ${relativeTime(m.lastFailedAt, now)}`);
  } else if (m.lastCompletedAt) {
    parts.push(`completed ${relativeTime(m.lastCompletedAt, now)}`);
  }
  return parts.join(" · ");
};

export const migrationCardTone = (status: string) => {
  if (status === "failed")
    return "border-[rgba(240,79,79,0.3)] bg-[linear-gradient(180deg,rgba(240,79,79,0.07),rgba(255,255,255,0.012))]";
  if (status === "running")
    return "border-[rgba(230,194,122,0.16)] bg-[linear-gradient(180deg,rgba(230,194,122,0.07),rgba(255,255,255,0.012))]";
  return "";
};
