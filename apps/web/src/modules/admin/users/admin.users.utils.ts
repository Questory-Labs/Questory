import { relativeTime } from "../jobs/admin.jobs.utils";
import type { AdminUser } from "./admin.users.types";

export const MODULE_KEYS = [
  { key: "games", label: "Games", on: "border-[var(--games)] text-[var(--games)]" },
  { key: "music", label: "Music", on: "border-[var(--music)] text-[var(--music)]" },
  { key: "watch", label: "Watch", on: "border-[var(--watch)] text-[var(--watch)]" },
  { key: "read", label: "Read", on: "border-[var(--read)] text-[var(--read)]" },
] as const;

export const userInitial = (user: AdminUser) =>
  (user.personaName || user.email || "?").trim().charAt(0).toUpperCase() || "?";

export const joinedLabel = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
};

export const syncSummary = (user: AdminUser, now = Date.now()) => {
  const latest = user.latestSync;
  if (latest?.status === "failed") {
    return { failed: true, label: `Failed · ${relativeTime(latest.at, now)}` };
  }
  const at = user.lastSyncedAt ?? latest?.at ?? null;
  if (!at) return { failed: false, label: "Never" };
  return { failed: false, label: relativeTime(at, now) };
};

export const filterUsers = (users: AdminUser[], query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return users;
  return users.filter((u) =>
    [u.email, u.personaName, u.steamId].some((v) => v?.toLowerCase().includes(q)),
  );
};
