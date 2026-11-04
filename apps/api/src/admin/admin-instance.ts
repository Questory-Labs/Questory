import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let cachedVersion: string | null | undefined;

export function readApiVersion(): string | null {
  if (cachedVersion !== undefined) return cachedVersion;
  try {
    const raw = readFileSync(resolve(__dirname, "../../package.json"), "utf8");
    const version = (JSON.parse(raw) as { version?: unknown }).version;
    cachedVersion = typeof version === "string" ? version : null;
  } catch {
    cachedVersion = null;
  }
  return cachedVersion;
}

export type DomainHealthStatus = "up" | "disabled" | "unavailable";

export function domainHealth(service: string, enabled: boolean, available: boolean) {
  const status: DomainHealthStatus = !available
    ? "unavailable"
    : enabled
      ? "up"
      : "disabled";
  return { ok: status === "up", service, embedded: true, enabled, status };
}

export type UserModuleSource = {
  accounts: { providerAccountId: string }[];
  libraryEntries: { id: string }[];
  listenHourBuckets: { id: string }[];
  watchHourBuckets: { id: string }[];
  readHourBuckets: { id: string }[];
};

export function userModules(u: UserModuleSource) {
  return {
    games: u.accounts.length > 0 || u.libraryEntries.length > 0,
    music: u.listenHourBuckets.length > 0,
    watch: u.watchHourBuckets.length > 0,
    read: u.readHourBuckets.length > 0,
  };
}

export function serializeLatestSync(
  job: { status: string; type: string; createdAt: Date; finishedAt: Date | null } | undefined,
) {
  if (!job) return null;
  return {
    status: job.status,
    type: job.type,
    at: (job.finishedAt ?? job.createdAt).toISOString(),
  };
}
