import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { ReadTitleDetail, ReadTitleTimeseries } from "@questorylabs/shared";
import { formatDateTime } from "@/lib/dates";
import { ShelfBars } from "@/modules/media/shelf/components/ShelfBars";
import { ShelfEmpty, ShelfStatus } from "@/modules/media/shelf/components/ShelfStatus";
import { sourceLabel } from "@/modules/media/shelf/shelf.utils";
import { readStatusLabel } from "../../library/read.library.constants";
import { READ_TITLE_WEEKS } from "../read.title.utils";

const eventLabel = (e: ReadTitleDetail["recentEvents"][number]): string =>
  [
    e.chaptersRead != null ? `Ch. ${e.chaptersRead}` : null,
    e.volumesRead != null ? `Vol. ${e.volumesRead}` : null,
    e.status ? readStatusLabel(e.status) : null,
  ]
    .filter(Boolean)
    .join(" · ") || "Update";

export const ReadTitleHistory = ({
  d,
  weeks,
}: {
  d: ReadTitleDetail;
  weeks?: UseResourceResult<ReadTitleTimeseries>;
}) => {
  const bars = (weeks?.value?.items ?? []).map((w) => ({ label: w.label, count: w.count }));
  return (
    <section
      aria-labelledby="read-title-hist"
      className="q-in q-lift flex flex-wrap gap-7 rounded-3xl border border-white/[0.07] bg-gradient-to-b from-white/[0.05] to-white/[0.016] p-5 [--i:2]"
    >
      <div className="min-w-0 flex-[1.2_1_380px]">
        <div className="flex items-baseline justify-between">
          <h2 id="read-title-hist" className="m-0 text-[17px] font-normal">
            Reading history
          </h2>
          <p className="label-mono m-0 text-[10px] text-[var(--faint)]">
            Chapters / week · {READ_TITLE_WEEKS} weeks
          </p>
        </div>
        <div className="mt-[18px]">
          {weeks ? (
            <ShelfStatus res={weeks} error="Could not load weekly reading.">
              {bars.some((b) => b.count > 0) ? (
                <ShelfBars
                  items={bars}
                  accent="var(--read)"
                  ariaLabel={`Chapters per week over the last ${READ_TITLE_WEEKS} weeks`}
                  heightClass="h-[120px]"
                  gapClass="gap-2"
                  labels="none"
                />
              ) : (
                <ShelfEmpty>No chapters in the last {READ_TITLE_WEEKS} weeks.</ShelfEmpty>
              )}
            </ShelfStatus>
          ) : null}
        </div>
      </div>
      <div className="min-w-0 flex-[1_1_300px]">
        {d.recentEvents.length ? (
          <ul className="m-0 list-none p-0">
            {d.recentEvents.map((e) => (
              <li key={e.id} className="q-row flex justify-between gap-3 rounded-xl px-2 py-2.5 hover:bg-white/[0.04]">
                <span className="font-normal">{eventLabel(e)}</span>
                <span className="font-mono text-[11px] text-[var(--muted)]">
                  {sourceLabel(e.source)} · {formatDateTime(e.readAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-sm text-[var(--muted)]">No events yet.</p>
        )}
      </div>
    </section>
  );
};
