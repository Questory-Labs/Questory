"use client";

import {
  PageHeader,
  ResourceStatus,
  SkeletonStatGrid,
  StateMessage,
} from "@/components/ui";
import { featureErrorMessage } from "@/lib/app-status";
import { sourceLabel } from "@/modules/media/shelf/shelf.utils";
import { ContinueWatching } from "./components/ContinueWatching";
import { LogWatchButton } from "./components/LogWatchButton";
import { WatchCharts } from "./components/WatchCharts";
import { WatchKpis } from "./components/WatchKpis";
import { WatchMediaPicker } from "./components/WatchMediaPicker";
import type { WatchHomeViewProps } from "./watch.home.types";
import { DOW_FULL } from "./watch.home.utils";

export const WatchHomeView = (props: Record<string, unknown>) => {
  const view = props as WatchHomeViewProps;
  const { media, setMedia, insights } = view;
  const d = insights.value;
  const hours = d ? Math.round(d.watchingMinutes / 60) : null;
  const peakDay = d?.peakDow ? DOW_FULL[d.peakDow.label] ?? d.peakDow.label : null;
  const sourceNames = (view.sources.value?.items ?? []).slice(0, 3).map((s) => sourceLabel(s.label));

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-3.5">
      <PageHeader
        className="mb-0 px-1 pb-2.5 pt-2"
        eyebrow={["Watch", "last 30 days", sourceNames.join(", ")].filter(Boolean).join(" · ")}
        title={
          hours != null ? (
            <>
              {hours} {hours === 1 ? "hour" : "hours"}
              {peakDay ? (
                <>
                  , <span className="font-serif text-[#efd9a8]">mostly {peakDay}</span>
                </>
              ) : null}
            </>
          ) : (
            "Watch"
          )
        }
        actions={
          <div className="header-controls">
            <WatchMediaPicker value={media} onChange={setMedia} />
            <LogWatchButton />
          </div>
        }
      />

      <ContinueWatching continuing={view.continuing} />

      <ResourceStatus
        failed={insights.failed}
        empty={insights.empty}
        loading={<SkeletonStatGrid count={5} />}
        error={
          <StateMessage variant="error">
            {featureErrorMessage(insights.error, "Could not load watch analytics.")}
          </StateMessage>
        }
      >
        {d ? <WatchKpis d={d} media={media} /> : null}
      </ResourceStatus>

      <WatchCharts
        insights={insights}
        hour={view.hour}
        dow={view.dow}
        years={view.years}
        sources={view.sources}
        tops={view.tops}
      />
    </div>
  );
};
