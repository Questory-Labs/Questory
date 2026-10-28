import type { UseResourceResult } from "@questorylabs/qhttp/react";

export type DomainHealthStatus = "up" | "disabled" | "unavailable";

export type DomainHealth = {
  ok?: boolean;
  service?: string;
  embedded?: boolean;
  enabled?: boolean;
  status?: DomainHealthStatus;
};

export type RecentCronRun = {
  id: string;
  jobName: string;
  status: string;
  startedAt: string;
  finishedAt?: string | null;
  error?: string | null;
};

export type Overview = {
  version?: string | null;
  uptimeSeconds?: number;
  users: { total: number; admins: number };
  signup: { open: boolean; enabledSetting: boolean };
  syncJobs: { pending: number; running: number; failed: number };
  enrichment: {
    musicPending: number;
    watchPending: number;
    importsActive: number;
  };
  music: DomainHealth;
  watch: DomainHealth;
  abuse: Record<string, number>;
  recentCronRuns: RecentCronRun[];
};

export type AttentionItem = {
  key: string;
  tone: "danger" | "warn";
  text: string;
  href: string;
  action: string;
};

export type AdminHomeViewProps = {
  overview: UseResourceResult<Overview>;
};
