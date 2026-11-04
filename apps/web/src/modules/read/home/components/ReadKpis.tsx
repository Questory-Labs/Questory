import type { ReadInsights } from "@questorylabs/shared";
import { CountUp } from "@questorylabs/ui";
import { formatDeltaPct } from "@/lib/read";
import { deltaTone, ShelfKpiTile } from "@/modules/media/shelf/components/ShelfKpiTile";

const chaptersNote = (d: ReadInsights, rangeLabel: string): string | undefined => {
  const prev = d.compare.previousChapters;
  if (prev == null) return undefined;
  const diff = d.chaptersLogged - prev;
  return `${diff >= 0 ? "+" : ""}${diff} vs prior ${rangeLabel.replace(/^last /, "")}`;
};

export const ReadKpis = ({ d, rangeLabel }: { d: ReadInsights; rangeLabel: string }) => (
  <div className="q-in grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5 [--i:2]">
    <ShelfKpiTile
      label="Chapters logged"
      value={<CountUp value={d.chaptersLogged} />}
      note={chaptersNote(d, rangeLabel)}
      tone={deltaTone(d.compare.chaptersDeltaPct)}
    />
    <ShelfKpiTile
      label="Events"
      value={<CountUp value={d.periodEvents} />}
      note={d.compare.deltaPct != null ? `${formatDeltaPct(d.compare.deltaPct)} vs prior` : undefined}
      tone={deltaTone(d.compare.deltaPct)}
    />
    <ShelfKpiTile label="New titles" value={<CountUp value={d.newTitles} />} />
    <ShelfKpiTile label="Unique titles" value={<CountUp value={d.uniqueTitles} />} />
  </div>
);
