import type { UseActionResult, UseResourceResult } from "@questorylabs/qhttp/react";
import type { Dispatch, SetStateAction } from "react";

export type CronRun = {
  id: string;
  jobName: string;
  status: string;
  triggeredBy: string;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
};

export type CronJobStatus = {
  name: string;
  schedule: string | null;
  registered: boolean;
  running: boolean;
  nextDate: string | null;
  lastRun: CronRun | null;
};

export type CronStatus = {
  enabled: boolean;
  secretConfigured: boolean;
  jobs: CronJobStatus[];
};

export type CronRunsResponse = {
  page: number;
  pageSize: number;
  total: number;
  runs: CronRun[];
};

export type AdminCronViewProps = {
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  status: UseResourceResult<CronStatus>;
  runs: UseResourceResult<CronRunsResponse>;
  trigger: UseActionResult<unknown, string>;
};
