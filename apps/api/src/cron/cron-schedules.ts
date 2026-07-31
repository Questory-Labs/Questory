export const CRON_JOB_NAMES = [
  "daily-refresh",
  "recover-failed-sync",
  "watch-sync",
  "catalog-sync",
] as const;

export type CronJobName = (typeof CRON_JOB_NAMES)[number];

/** Jobs registered by the in-process scheduler. */
export const SCHEDULED_CRON_JOBS = [
  "daily-refresh",
  "recover-failed-sync",
  "watch-sync",
  "catalog-sync",
] as const;

export type ScheduledCronJobName = (typeof SCHEDULED_CRON_JOBS)[number];

const DEFAULT_SCHEDULES: Record<ScheduledCronJobName, string> = {
  "daily-refresh": "0 3 * * *",
  "recover-failed-sync": "*/15 * * * *",
  "watch-sync": "0 */6 * * *",
  "catalog-sync": "0 4 * * *",
};

export function getCronSchedule(name: ScheduledCronJobName): string {
  switch (name) {
    case "daily-refresh":
      return process.env.CRON_DAILY_SCHEDULE || DEFAULT_SCHEDULES[name];
    case "recover-failed-sync":
      return process.env.CRON_RECOVERY_SCHEDULE || DEFAULT_SCHEDULES[name];
    case "watch-sync":
      return process.env.CRON_WATCH_SCHEDULE || DEFAULT_SCHEDULES[name];
    case "catalog-sync":
      return process.env.CRON_CATALOG_SCHEDULE || DEFAULT_SCHEDULES[name];
  }
}

export function getConfiguredSchedules(): Record<
  ScheduledCronJobName,
  string
> {
  return {
    "daily-refresh": getCronSchedule("daily-refresh"),
    "recover-failed-sync": getCronSchedule("recover-failed-sync"),
    "watch-sync": getCronSchedule("watch-sync"),
    "catalog-sync": getCronSchedule("catalog-sync"),
  };
}
