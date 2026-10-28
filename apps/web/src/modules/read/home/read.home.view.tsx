"use client";

import { CountUp } from "@questorylabs/ui";
import { SegmentedControl } from "@/components/SegmentedControl";
import { PageHeader, ResourceStatus, SkeletonStatGrid, StateMessage } from "@/components/ui";
import { featureErrorMessage } from "@/lib/app-status";
import { formatRelativePlayed } from "@/lib/dates";
import { CurrentlyReading } from "./components/CurrentlyReading";
import { ReadCharts } from "./components/ReadCharts";
import { ReadKpis } from "./components/ReadKpis";
import type { ReadHomeViewProps } from "./read.home.types";
import { dayPartPhrase, latestReadSync, rangeLong, READ_HOME_RANGES } from "./read.home.utils";

export const ReadHomeView = (props: Record<string, unknown>) => {
  const view = props as ReadHomeViewProps;
  const { insights, range, setRange } = view;
  const d = insights.value;
  const phrase = dayPartPhrase(d?.peakHour?.hour);
  const sync = latestReadSync(view.overview?.value);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-3.5">
      <PageHeader
        className="mb-0 px-1 pb-2.5 pt-2"
        eyebrow={
          sync
            ? `Read · synced from ${sync.provider} ${formatRelativePlayed(sync.at)}`
            : `Read · ${rangeLong(range)}`
        }
        title={
          d ? (
            <>
              <CountUp value={d.chaptersLogged} /> {d.chaptersLogged === 1 ? "chapter" : "chapters"}
              {phrase ? (
                <>
                  , <span className="font-serif text-[#c9d1f6]">{phrase}</span>
                </>
              ) : null}
            </>
          ) : (
            "Read"
          )
        }
        actions={
          <SegmentedControl
            label="Range"
            value={range}
            onChange={setRange}
            options={READ_HOME_RANGES}
          />
        }
      />

      {view.reading ? <CurrentlyReading reading={view.reading} /> : null}

      <ResourceStatus
        failed={insights.failed}
        empty={insights.empty}
        loading={<SkeletonStatGrid count={4} />}
        error={
          <StateMessage variant="error">
            {featureErrorMessage(insights.error, "Could not load read analytics.")}
          </StateMessage>
        }
      >
        {d ? <ReadKpis d={d} rangeLabel={rangeLong(range)} /> : null}
      </ResourceStatus>

      <ReadCharts
        insights={insights}
        hour={view.hour}
        dow={view.dow}
        formats={view.formats}
        sources={view.sources}
      />
    </div>
  );
};
