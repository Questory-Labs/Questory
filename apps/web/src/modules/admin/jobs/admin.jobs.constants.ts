import type { JobsTab } from "./admin.jobs.types";

export const JOBS_TABS = ["cron", "scrapers", "enrichment"] as const;

export const JOBS_TAB_OPTIONS: { value: JobsTab; label: string }[] = [
  { value: "cron", label: "Scheduled" },
  { value: "scrapers", label: "Scrapers" },
  { value: "enrichment", label: "Enrichment" },
];
