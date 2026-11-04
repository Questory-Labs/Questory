"use client";

import { PageHeader } from "@/components/ui";
import { SegmentedControl } from "@/components/SegmentedControl";
import { AdminCronController } from "../cron/admin.cron.controller";
import { AdminCronView } from "../cron/admin.cron.view";
import { AdminEnrichmentController } from "../enrichment/admin.enrichment.controller";
import { AdminEnrichmentView } from "../enrichment/admin.enrichment.view";
import { AdminScrapersController } from "../scrapers/admin.scrapers.controller";
import { AdminScrapersView } from "../scrapers/admin.scrapers.view";
import { JOBS_TAB_OPTIONS } from "./admin.jobs.constants";
import type { AdminJobsViewProps } from "./admin.jobs.types";

export const AdminJobsView = (props: Record<string, unknown>) => {
  const { tab, setTab } = props as AdminJobsViewProps;

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader
        eyebrow="Scheduled work, store scrapers and metadata enrichment"
        title={
          <>
            Jobs, <span className="font-serif">quietly running</span>
          </>
        }
        actions={
          <SegmentedControl
            label="Job type"
            value={tab}
            onChange={setTab}
            options={JOBS_TAB_OPTIONS}
          />
        }
      />

      {tab === "cron" ? (
        <AdminCronController>
          <AdminCronView />
        </AdminCronController>
      ) : null}
      {tab === "scrapers" ? (
        <AdminScrapersController>
          <AdminScrapersView />
        </AdminScrapersController>
      ) : null}
      {tab === "enrichment" ? (
        <AdminEnrichmentController>
          <AdminEnrichmentView />
        </AdminEnrichmentController>
      ) : null}
    </div>
  );
};
