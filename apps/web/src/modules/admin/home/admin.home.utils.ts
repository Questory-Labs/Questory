import { relativeTime } from "../jobs/admin.jobs.utils";
import type { AttentionItem, DomainHealth, Overview } from "./admin.home.types";

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

export const ABUSE_LABELS: Record<string, string> = {
  honeypotRegister: "Honeypot signups",
  honeypotLogin: "Honeypot logins",
  challengeFail: "Failed challenges",
  rateLimited: "Rate-limited requests",
  loginLockout: "Login lockouts",
  originReject: "Rejected origins",
};

export const uptimeLabel = (seconds: number | null | undefined) => {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return null;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"}`;
};

export const healthLabel = (health: DomainHealth | undefined) => {
  if (!health) return "—";
  if (health.status === "disabled") return "Off";
  if (health.status === "unavailable") return "Down";
  return health.ok === false ? "Down" : "Up";
};

export const healthTone = (health: DomainHealth | undefined) => {
  const label = healthLabel(health);
  if (label === "Up") return "ok" as const;
  if (label === "Down") return "danger" as const;
  return "muted" as const;
};

export const cronStatusLabel = (status: string) => {
  if (status === "completed") return "OK";
  if (!status) return "—";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export const buildAttention = (overview: Overview, now = Date.now()): AttentionItem[] => {
  const items: AttentionItem[] = [];
  for (const [key, label] of [
    ["music", "Music"],
    ["watch", "Watch"],
  ] as const) {
    if (healthLabel(overview[key]) === "Down") {
      items.push({
        key: `health-${key}`,
        tone: "danger",
        text: `${label} service is unavailable`,
        href: "/admin/jobs?tab=enrichment",
        action: "Open enrichment",
      });
    }
  }
  if (overview.syncJobs.failed > 0) {
    const n = overview.syncJobs.failed;
    items.push({
      key: "sync-failed",
      tone: "warn",
      text: `${n} sync ${n === 1 ? "job has" : "jobs have"} failed`,
      href: "/admin/users",
      action: "Open users",
    });
  }
  const seen = new Set<string>();
  for (const run of overview.recentCronRuns) {
    if (seen.has(run.jobName)) continue;
    seen.add(run.jobName);
    if (run.status !== "failed") continue;
    items.push({
      key: `cron-${run.id}`,
      tone: "danger",
      text: `${run.jobName} failed ${relativeTime(run.finishedAt ?? run.startedAt, now)}`,
      href: "/admin/jobs?tab=cron",
      action: "Open cron",
    });
  }
  return items;
};

export const attentionHeadline = (count: number) => {
  if (count === 0) return "all quiet";
  const word = WORDS[count] ?? String(count);
  return `${word} ${count === 1 ? "thing needs" : "things need"} you`;
};
