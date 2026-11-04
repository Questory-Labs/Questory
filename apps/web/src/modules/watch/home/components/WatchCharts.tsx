import { formatMinutes } from "@/lib/watch";
import { ShelfBars } from "@/modules/media/shelf/components/ShelfBars";
import { ShelfRankList } from "@/modules/media/shelf/components/ShelfRankList";
import { ShelfSection } from "@/modules/media/shelf/components/ShelfSection";
import { ShelfShareList } from "@/modules/media/shelf/components/ShelfShareList";
import { ShelfEmpty as Empty, ShelfStatus as Block } from "@/modules/media/shelf/components/ShelfStatus";
import { sourceLabel, toShares } from "@/modules/media/shelf/shelf.utils";
import type { WatchHomeViewProps } from "../watch.home.types";

const ACCENT = "var(--watch)";

export const WatchCharts = ({
  insights,
  hour,
  dow,
  years,
  sources,
  tops,
}: Pick<WatchHomeViewProps, "insights" | "hour" | "dow" | "years" | "sources" | "tops">) => {
  const d = insights.value;
  const dowItems = (dow.value ?? []).map((b) => ({ label: b.label.slice(0, 1), count: b.count }));
  const hourItems = (hour.value ?? []).map((b) => ({ label: b.label, count: b.count }));
  const yearItems = (years.value?.items ?? [])
    .filter((i) => i.key !== "unknown")
    .slice()
    .reverse()
    .map((b) => ({ label: b.label, count: b.count }));
  const shareItems = toShares(
    (sources.value?.items ?? []).map((s) => ({ ...s, label: sourceLabel(s.label) })),
    sources.value?.periodWatches ?? 0,
  );
  const topItems = (tops.value ?? []).map((t) => ({
    id: t.id,
    href: `/watch/titles/${t.id}`,
    name: t.name,
    value: t.minutes ? formatMinutes(t.minutes) : t.count,
  }));
  const peakCaption = [d?.peakHour ? `Peak ${d.peakHour.label}` : null, d?.topGenre?.name ?? null]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className="flex flex-wrap gap-3.5">
        <ShelfSection
          id="watch-dow"
          title="By day of week"
          className="q-in flex-[1.3_1_360px] [--i:3]"
          aside={
            d?.peakDow ? (
              <>
                Peak <span className="text-[var(--ink)]">{d.peakDow.label}</span>
              </>
            ) : null
          }
        >
          <div className="mt-[22px]">
            <Block res={dow} error="Could not load day-of-week watches.">
              {dowItems.some((i) => i.count > 0) ? (
                <ShelfBars items={dowItems} accent={ACCENT} ariaLabel="Watches by day of week" />
              ) : (
                <Empty>No watches in this range.</Empty>
              )}
            </Block>
          </div>
          {peakCaption ? <p className="mt-3 text-xs text-[var(--muted)]">{peakCaption}</p> : null}
        </ShelfSection>
        <ShelfSection
          id="watch-top"
          title="Most watched"
          className="q-in flex-[1_1_300px] [--i:4]"
          bodyClassName="px-3 pb-2.5 pt-[18px] [&_h2]:mx-2"
        >
          <div className="mt-1.5">
            <Block res={tops} error="Could not load top titles." rows>
              {topItems.length ? <ShelfRankList items={topItems} /> : <Empty>No watches in this range.</Empty>}
            </Block>
          </div>
        </ShelfSection>
        <ShelfSection
          id="watch-src"
          title="Sources"
          className="q-in flex-[1_1_260px] [--i:5]"
          link={{ href: "/sources?tab=watch", label: "Manage" }}
        >
          <div className="mt-3.5">
            <Block res={sources} error="Could not load watch sources." rows>
              {shareItems.length ? (
                <ShelfShareList items={shareItems} accent={ACCENT} />
              ) : (
                <Empty>No sources yet.</Empty>
              )}
            </Block>
          </div>
        </ShelfSection>
      </div>
      <div className="flex flex-wrap gap-3.5">
        <ShelfSection
          id="watch-hour"
          title="Hour of day"
          className="q-in flex-[1.4_1_420px] [--i:6]"
          aside={d?.peakHour ? <>Peak <span className="text-[var(--ink)]">{d.peakHour.label}</span></> : null}
        >
          <div className="mt-[18px]">
            <Block res={hour} error="Could not load hour-of-day watches.">
              <ShelfBars
                items={hourItems}
                accent={ACCENT}
                ariaLabel="Watches by hour of day"
                heightClass="h-[140px]"
                gapClass="gap-1"
                barClass="rounded-[3px]"
                labels="ends"
              />
            </Block>
          </div>
        </ShelfSection>
        <ShelfSection id="watch-years" title="Release years" className="q-in flex-[1_1_320px] [--i:7]">
          <div className="mt-[18px]">
            <Block res={years} error="Could not load release years.">
              {yearItems.length ? (
                <ShelfBars
                  items={yearItems}
                  accent={ACCENT}
                  ariaLabel="Watches by release year"
                  heightClass="h-[140px]"
                  gapClass="gap-1"
                  barClass="rounded-[3px]"
                  labels="ends"
                />
              ) : (
                <Empty>No release years yet.</Empty>
              )}
            </Block>
          </div>
        </ShelfSection>
      </div>
    </>
  );
};
