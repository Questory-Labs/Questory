import type { WatchCatalogLog, WatchTitleDetail } from "@questorylabs/shared";
import { ProgressRing } from "@questorylabs/ui";
import { Button } from "@/components/ui";
import { displayLabel } from "@/lib/display-label";
import { PosterThumb } from "@/modules/media/shelf/components/PosterThumb";
import { RatingDots } from "@/modules/media/shelf/components/RatingDots";
import { progressFraction } from "@/modules/media/shelf/shelf.utils";
import { episodeCode } from "../../home/watch.home.utils";
import type { WatchTitleMarkMessage } from "../watch.title.types";
import { formatHoursMinutes, markWatchedBody, tmdbUrl } from "../watch.title.utils";

const pillClass =
  "rounded-full border border-white/[0.12] bg-[rgba(10,10,11,0.6)] px-[11px] py-1 text-[var(--dim)] backdrop-blur-md";

export const WatchTitleHero = ({
  d,
  markBusy,
  markMessage,
  onMark,
}: {
  d: WatchTitleDetail;
  markBusy?: boolean;
  markMessage?: WatchTitleMarkMessage;
  onMark?: (body: WatchCatalogLog) => void;
}) => {
  const t = d.title;
  const name = displayLabel(t.displayName, t.name);
  const isMovie = t.type === "movie";
  const body = markWatchedBody(d);
  const tmdb = tmdbUrl(d);
  const total = t.totalEpisodes ?? null;
  const done = d.distinctEpisodesWatched ?? 0;
  const ring = progressFraction(done, total);
  const time = d.totalMinutesWatched ? formatHoursMinutes(d.totalMinutesWatched) : null;
  const markLabel =
    body?.type === "show" && body.seasonNumber != null && body.episodeNumber != null
      ? `Mark ${episodeCode(body.seasonNumber, body.episodeNumber)} watched`
      : "Log a watch today";
  const yearPill = t.year ? `${t.year}${!isMovie && t.status && /return|production|airing/i.test(t.status) ? " –" : ""}` : null;

  return (
    <section
      aria-labelledby="watch-title-name"
      className="q-in relative flex min-h-[360px] flex-wrap items-end gap-7 overflow-hidden rounded-3xl border border-white/[0.07] p-7 [--i:1]"
    >
      <div aria-hidden="true" className="absolute inset-0 bg-[#0d0d0e]">
        {t.backdropUrl ? (
          <PosterThumb url={t.backdropUrl} seed={t.id} className="opacity-60" />
        ) : (
          <div className="absolute -inset-[10%] bg-[radial-gradient(60%_70%_at_70%_30%,rgba(230,194,122,0.35),transparent_62%)]" />
        )}
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(0deg,rgba(9,9,10,0.96),rgba(9,9,10,0.25)_60%,transparent)]"
      />
      <div className="relative aspect-[2/3] w-[180px] flex-none overflow-hidden rounded-[18px] border border-white/[0.14] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)]">
        <PosterThumb url={t.posterUrl} seed={t.id} tint="var(--watch)" alt={name} />
      </div>
      <div className="relative min-w-0 flex-[1_1_380px]">
        <p className="m-0 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(230,194,122,0.3)] bg-[rgba(10,10,11,0.6)] px-[11px] py-1 text-[#efd9a8] backdrop-blur-md">
            <span aria-hidden="true" className="h-[5px] w-[5px] rounded-full bg-[var(--watch)]" />
            {isMovie ? "Movie" : "Show"}
          </span>
          {yearPill ? <span className={pillClass}>{yearPill}</span> : null}
          {t.genres.slice(0, 3).map((g) => (
            <span key={g} className={pillClass}>
              {g}
            </span>
          ))}
        </p>
        <h1
          id="watch-title-name"
          className="mb-0 mt-4 text-[clamp(44px,5.4vw,76px)] font-extralight leading-[0.95] tracking-[-0.045em]"
        >
          {name}
        </h1>
        {t.displayName && t.displayName !== t.name ? (
          <p className="mb-0 mt-2 text-sm text-[var(--muted)]">{t.name}</p>
        ) : null}
        {t.overview ? <p className="mb-0 mt-3 max-w-[62ch] text-[#b9b9be]">{t.overview}</p> : null}
        <div className="mt-[18px] flex flex-wrap gap-2.5">
          {onMark && body ? (
            <Button type="button" size="lg" disabled={markBusy} onClick={() => onMark(body)}>
              {markBusy ? "Logging…" : markLabel}
            </Button>
          ) : null}
          {tmdb ? (
            <a
              href={tmdb}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[46px] items-center gap-2 rounded-full border border-white/[0.16] bg-[rgba(10,10,11,0.5)] px-5 text-sm text-[var(--ink)] no-underline backdrop-blur-md hover:border-white/30"
            >
              Open on TMDB ↗
            </a>
          ) : null}
        </div>
        <p
          role="status"
          className={`mb-0 mt-2 min-h-[18px] text-[13px] ${markMessage?.tone === "error" ? "text-[var(--danger)]" : "text-[var(--ok)]"}`}
        >
          {markMessage?.text ?? ""}
        </p>
      </div>
      <dl className="relative m-0 flex flex-[0_1_auto] flex-wrap gap-7">
        {!isMovie && ring != null ? (
          <div className="flex items-center gap-3">
            <ProgressRing value={ring} size={52} stroke={4} color="var(--watch)" label={`${done} of ${total} episodes watched`} />
            <div>
              <dt className="text-xs text-[var(--muted)]">Progress</dt>
              <dd className="m-0 mt-0.5 text-[22px] font-light">
                {done}
                <span className="text-[13px] text-[var(--faint)]"> of {total} episodes</span>
              </dd>
            </div>
          </div>
        ) : null}
        {time ? (
          <div>
            <dt className="text-xs text-[var(--muted)]">Time watched</dt>
            <dd className="m-0 mt-0.5 text-[44px] font-extralight leading-none tracking-[-0.04em]">
              {time.h}
              <span className="text-sm tracking-normal text-[var(--muted)]">h </span>
              {time.m}
              <span className="text-sm tracking-normal text-[var(--muted)]">m</span>
            </dd>
          </div>
        ) : null}
        {d.userRating != null ? (
          <div>
            <dt className="text-xs text-[var(--muted)]">Your rating</dt>
            <dd className="m-0 mt-3.5">
              <RatingDots rating={d.userRating} accent="var(--watch)" size="md" />
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
};
