export type JobsTab = "cron" | "scrapers" | "enrichment";

export type AdminJobsViewProps = {
  tab: JobsTab;
  setTab: (next: JobsTab) => void;
};
