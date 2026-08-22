import type { UseResourceResult } from "@questorylabs/qhttp/react";

export type Overview = {
  users: { total: number; admins: number };
  signup: { open: boolean; enabledSetting: boolean };
  syncJobs: { pending: number; running: number; failed: number };
  enrichment: {
    musicPending: number;
    watchPending: number;
    importsActive: number;
  };
  music: { ok?: boolean };
  watch: { ok?: boolean };
  abuse: Record<string, number>;
  recentCronRuns: {
    id: string;
    jobName: string;
    status: string;
    startedAt: string;
  }[];
};

export type AdminHomeViewProps = {
  overview: UseResourceResult<Overview>;
};
