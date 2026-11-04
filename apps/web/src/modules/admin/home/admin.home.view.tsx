"use client";

import { ResourceStatus, SkeletonStatGrid } from "@questorylabs/ui";
import { AdminStat } from "../shared/components/AdminStat";
import {
  attentionHeadline,
  buildAttention,
  healthLabel,
  healthTone,
  uptimeLabel,
} from "./admin.home.utils";
import type { AdminHomeViewProps, Overview } from "./admin.home.types";
import { AbuseCountersPanel } from "./components/AbuseCountersPanel";
import { AttentionPanel } from "./components/AttentionPanel";
import { RecentJobsPanel } from "./components/RecentJobsPanel";

const eyebrowParts = (d: Overview | undefined) => {
  if (!d) return ["Instance"];
  const uptime = uptimeLabel(d.uptimeSeconds);
  return [
    "Instance",
    d.version ? `v${d.version}` : null,
    uptime ? `up ${uptime}` : null,
  ].filter((p): p is string => Boolean(p));
};

export const AdminHomeView = (props: Record<string, unknown>) => {
  const { overview } = props as AdminHomeViewProps;
  const d = overview.value;
  const attention = d ? buildAttention(d) : [];

  return (
    <div className="flex flex-col gap-3.5">
      <header className="q-in px-1 pb-2.5 pt-2">
        <p className="label-mono flex items-center gap-2">
          <span className="dot q-live text-[var(--ok)]" aria-hidden />
          {eyebrowParts(d).join(" · ")}
        </p>
        <h1 className="mt-1.5 text-[clamp(34px,4vw,52px)] font-light leading-none tracking-[-0.035em]">
          Instance,{" "}
          <span className="font-serif text-[var(--muted)]">
            {d ? attentionHeadline(attention.length) : "checking in"}
          </span>
        </h1>
      </header>

      <ResourceStatus
        failed={overview.failed}
        empty={overview.empty}
        loading={
          <>
            <SkeletonStatGrid count={4} />
            <SkeletonStatGrid count={4} className="mt-3.5" />
          </>
        }
        error={
          <p className="text-sm text-[var(--warm)]">
            {(overview.error as Error)?.message}
          </p>
        }
      >
        {d ? (
          <>
            <AttentionPanel items={attention} />

            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
              <AdminStat label="Users" value={d.users.total} index={2} />
              <AdminStat label="Admins" value={d.users.admins} index={3} />
              <AdminStat
                label="Signup"
                value={d.signup.open ? "Open" : "Closed"}
                index={4}
              />
              <AdminStat
                label="Sync failed"
                value={d.syncJobs.failed}
                tone={d.syncJobs.failed > 0 ? "danger" : "muted"}
                index={5}
              />
              <AdminStat
                label="Music service"
                value={healthLabel(d.music)}
                tone={healthTone(d.music)}
                valueTone={healthTone(d.music) === "muted" ? undefined : healthTone(d.music)}
                live={healthTone(d.music) === "ok"}
                index={6}
              />
              <AdminStat
                label="Watch service"
                value={healthLabel(d.watch)}
                tone={healthTone(d.watch)}
                valueTone={healthTone(d.watch) === "muted" ? undefined : healthTone(d.watch)}
                live={healthTone(d.watch) === "ok"}
                index={7}
              />
              <AdminStat
                label="Music enrich pending"
                value={d.enrichment.musicPending}
                tone={d.enrichment.musicPending > 0 ? "warn" : "muted"}
                index={8}
              />
              <AdminStat
                label="Watch enrich pending"
                value={d.enrichment.watchPending}
                tone={d.enrichment.watchPending > 0 ? "warn" : "muted"}
                index={9}
              />
            </div>

            <div className="flex flex-wrap gap-3.5">
              <RecentJobsPanel runs={d.recentCronRuns} />
              <AbuseCountersPanel abuse={d.abuse} />
            </div>
          </>
        ) : null}
      </ResourceStatus>
    </div>
  );
};
