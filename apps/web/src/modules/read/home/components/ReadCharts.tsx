import { ShelfBars } from "@/modules/media/shelf/components/ShelfBars";
import { ShelfSection } from "@/modules/media/shelf/components/ShelfSection";
import { ShelfShareList } from "@/modules/media/shelf/components/ShelfShareList";
import { ShelfEmpty, ShelfStatus } from "@/modules/media/shelf/components/ShelfStatus";
import { sourceLabel, toShares } from "@/modules/media/shelf/shelf.utils";
import { formatLabel } from "../../library/read.library.utils";
import type { ReadHomeViewProps } from "../read.home.types";

const ACCENT = "var(--read)";

const Peak = ({ label }: { label: string | undefined }) =>
  label ? (
    <>
      Peak <span className="text-[var(--ink)]">{label}</span>
    </>
  ) : null;

export const ReadCharts = ({
  insights,
  hour,
  dow,
  formats,
  sources,
}: Pick<ReadHomeViewProps, "insights" | "hour" | "dow" | "formats" | "sources">) => {
  const d = insights.value;
  const hourItems = (hour.value ?? []).map((b) => ({ label: b.label, count: b.count }));
  const dowItems = (dow.value ?? []).map((b) => ({ label: b.label.slice(0, 1), count: b.count }));
  const formatShares = toShares(
    (formats.value?.items ?? []).map((f) => ({ ...f, label: formatLabel(f.key) })),
    formats.value?.periodEvents ?? 0,
  );
  const sourceShares = toShares(
    (sources.value?.items ?? []).map((s) => ({ ...s, label: sourceLabel(s.key) })),
    sources.value?.periodEvents ?? 0,
  );
  const caption = [d?.peakHour ? `Peak ${d.peakHour.label}` : null, d?.topGenre?.name ?? null]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className="flex flex-wrap gap-3.5">
        <ShelfSection
          id="read-hour"
          title="By hour"
          className="q-in flex-[1.4_1_420px] [--i:3]"
          aside={<Peak label={d?.peakHour?.label} />}
        >
          <div className="mt-[18px]">
            <ShelfStatus res={hour} error="Could not load hour-of-day events.">
              {hourItems.some((i) => i.count > 0) ? (
                <ShelfBars
                  items={hourItems}
                  accent={ACCENT}
                  ariaLabel="Reading by hour of day"
                  heightClass="h-[140px]"
                  gapClass="gap-1"
                  barClass="rounded-[3px]"
                  labels="ends"
                />
              ) : (
                <ShelfEmpty>No reading in this range.</ShelfEmpty>
              )}
            </ShelfStatus>
          </div>
          {caption ? <p className="mt-3 text-xs text-[var(--muted)]">{caption}</p> : null}
        </ShelfSection>
        <ShelfSection id="read-formats" title="Formats" className="q-in flex-[1_1_280px] [--i:4]">
          <div className="mt-4">
            <ShelfStatus res={formats} error="Could not load formats." rows>
              {formatShares.length ? (
                <ShelfShareList items={formatShares} accent={ACCENT} />
              ) : (
                <ShelfEmpty>No formats yet.</ShelfEmpty>
              )}
            </ShelfStatus>
          </div>
        </ShelfSection>
        <ShelfSection
          id="read-src"
          title="Sources"
          className="q-in flex-[1_1_240px] [--i:5]"
          link={{ href: "/sources?tab=read", label: "Manage" }}
        >
          <div className="mt-2">
            <ShelfStatus res={sources} error="Could not load read sources." rows>
              {sourceShares.length ? (
                <ShelfShareList items={sourceShares} accent={ACCENT} variant="dot" />
              ) : (
                <ShelfEmpty>No sources yet.</ShelfEmpty>
              )}
            </ShelfStatus>
          </div>
        </ShelfSection>
      </div>
      <ShelfSection
        id="read-dow"
        title="By day of week"
        className="q-in [--i:6]"
        aside={<Peak label={d?.peakDow?.label} />}
      >
        <div className="mt-[18px]">
          <ShelfStatus res={dow} error="Could not load day-of-week events.">
            {dowItems.some((i) => i.count > 0) ? (
              <ShelfBars items={dowItems} accent={ACCENT} ariaLabel="Reading by day of week" heightClass="h-[120px]" />
            ) : (
              <ShelfEmpty>No reading in this range.</ShelfEmpty>
            )}
          </ShelfStatus>
        </div>
      </ShelfSection>
    </>
  );
};
