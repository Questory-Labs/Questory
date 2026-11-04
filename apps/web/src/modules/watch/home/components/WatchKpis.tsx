import type { WatchInsights } from "@questorylabs/shared";
import { CountUp } from "@questorylabs/ui";
import { Panel } from "@/components/ui";
import { formatDeltaPct, formatMinutes } from "@/lib/watch";
import { deltaTone, ShelfKpiTile } from "@/modules/media/shelf/components/ShelfKpiTile";
import type { WatchMediaFilter } from "../watch.home.types";

const hoursDelta = (current: number, previous: number | null | undefined) => {
  if (previous == null) return null;
  const diff = Math.round((current - previous) / 60);
  return `${diff >= 0 ? "+" : ""}${diff}h vs prior 30 days`;
};

export const WatchKpis = ({ d, media }: { d: WatchInsights; media: WatchMediaFilter }) => {
  const hours = d.watchingMinutes / 60;
  const minutesNote = hoursDelta(d.watchingMinutes, d.compare.previousWatchingMinutes);
  return (
    <>
      <div className="q-in grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5 [--i:2]">
        <ShelfKpiTile
          label="Watching time"
          value={<CountUp value={hours} decimals={hours >= 100 ? 0 : 1} dimDecimals />}
          unit=" h"
          note={minutesNote ?? undefined}
          tone={deltaTone(d.compare.watchingMinutesDeltaPct)}
        />
        <ShelfKpiTile
          label="Watches"
          value={<CountUp value={d.periodWatches} />}
          note={d.compare.deltaPct != null ? `${formatDeltaPct(d.compare.deltaPct)} vs prior` : undefined}
          tone={deltaTone(d.compare.deltaPct)}
        />
        <ShelfKpiTile label="New titles" value={<CountUp value={d.newTitles} />} />
        <ShelfKpiTile label="Unique titles" value={<CountUp value={d.uniqueTitles} />} />
        <ShelfKpiTile
          label="Coverage"
          value={<CountUp value={d.runtimeCoverage} />}
          unit="%"
          note="watches with runtime"
        />
      </div>
      {media === "all" ? (
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Panel size="sm" className="px-[18px] py-3 text-sm">
            <p className="label-mono text-[var(--faint)]">Movies</p>
            <p className="mt-1">
              {d.movieWatches} watches · {formatMinutes(d.movieMinutes)}
            </p>
          </Panel>
          <Panel size="sm" className="px-[18px] py-3 text-sm">
            <p className="label-mono text-[var(--faint)]">TV</p>
            <p className="mt-1">
              {d.showWatches} watches · {formatMinutes(d.showMinutes)}
            </p>
          </Panel>
        </div>
      ) : null}
    </>
  );
};
