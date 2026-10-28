import type { WatchTitleDetail } from "@questorylabs/shared";
import { formatDateTime } from "@/lib/dates";
import { RatingDots } from "@/modules/media/shelf/components/RatingDots";
import { sourceLabel } from "@/modules/media/shelf/shelf.utils";
import { episodeCode } from "../../home/watch.home.utils";

export const WatchTitleTimeline = ({ d }: { d: WatchTitleDetail }) => (
  <section
    aria-labelledby="watch-hist"
    className="q-in q-lift min-w-0 flex-[1_1_300px] rounded-3xl border border-white/[0.07] bg-gradient-to-b from-white/[0.05] to-white/[0.016] p-5 [--i:3]"
  >
    <h2 id="watch-hist" className="m-0 text-[17px] font-normal">
      Your history
    </h2>
    {d.recentEvents.length ? (
      <ol className="relative mb-0 mt-4 flex list-none flex-col gap-[18px] p-0 pl-5">
        <span
          aria-hidden="true"
          className="absolute bottom-1.5 left-1 top-1.5 w-px bg-[linear-gradient(rgba(230,194,122,0.6),rgba(255,255,255,0.06))]"
        />
        {d.recentEvents.map((e, i) => (
          <li key={e.id} className="relative flex flex-wrap justify-between gap-3 text-sm">
            <span
              aria-hidden="true"
              className={`absolute -left-5 top-1.5 h-[9px] w-[9px] rounded-full ${i === 0 ? "bg-[var(--watch)] shadow-[0_0_8px_rgba(230,194,122,0.7)]" : "bg-white/25"}`}
            />
            <span className="font-normal">
              {e.episode ? episodeCode(e.episode.seasonNumber, e.episode.episodeNumber) : "Watched"}
              <span className="ml-2 font-mono text-[10px] text-[var(--faint)]">{sourceLabel(e.source)}</span>
            </span>
            <span className="flex items-center gap-2 text-[var(--muted)]">
              <RatingDots rating={e.rating} accent="var(--watch)" />
              {formatDateTime(e.watchedAt)}
            </span>
          </li>
        ))}
      </ol>
    ) : (
      <p className="mt-4 text-sm text-[var(--muted)]">No watches yet.</p>
    )}
  </section>
);
