import type { ReactNode } from "react";
import type { ReadTitleDetail } from "@questorylabs/shared";
import { TickScrubber } from "@questorylabs/ui";
import { Button } from "@/components/ui";
import { displayLabel } from "@/lib/display-label";
import { PosterThumb } from "@/modules/media/shelf/components/PosterThumb";
import { progressFraction } from "@/modules/media/shelf/shelf.utils";
import { formatLabel } from "../../library/read.library.utils";
import type { ReadTitleLogMessage } from "../read.title.types";
import { anilistMangaUrl, chaptersLeft, nextChapter, paceText, progressSummary } from "../read.title.utils";

const Pill = ({ dot, children, tone }: { dot: string; children: ReactNode; tone: string }) => (
  <span
    className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-[rgba(10,10,11,0.5)] px-3 py-1 text-xs"
    style={{ color: tone }}
  >
    <span aria-hidden="true" className="h-[5px] w-[5px] rounded-full" style={{ background: dot }} />
    {children}
  </span>
);

export const ReadTitleHero = ({
  d,
  logBusy,
  logMessage,
  onLogChapter,
}: {
  d: ReadTitleDetail;
  logBusy?: boolean;
  logMessage?: ReadTitleLogMessage;
  onLogChapter?: (chapter: number) => void;
}) => {
  const t = d.title;
  const name = displayLabel(t.displayName, t.name);
  const left = chaptersLeft(d);
  const next = nextChapter(d);
  const pace = paceText(d);
  const summary = progressSummary(d);
  const fraction = progressFraction(d.progressChapters ?? 0, t.chapters);
  const anilist = anilistMangaUrl(t.anilistId);

  return (
    <section
      aria-labelledby="read-title-name"
      className="q-in relative flex flex-wrap gap-8 overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-b from-white/[0.05] to-white/[0.016] p-7 [--i:1]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[20%] bg-[radial-gradient(40%_50%_at_70%_30%,rgba(174,185,242,0.22),transparent_70%)] blur-[30px]"
      />
      <div className="relative aspect-[2/3] w-[200px] flex-none overflow-hidden rounded-[18px] border border-white/10 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)]">
        <PosterThumb url={t.coverUrl} seed={t.id} tint="var(--read)" alt={name} />
      </div>
      <div className="relative flex min-w-0 flex-[1_1_380px] flex-col gap-3.5">
        <p className="m-0 flex flex-wrap gap-1.5">
          <Pill dot="var(--read)" tone="#c9d1f6">
            {formatLabel(t.format)}
          </Pill>
          {t.publishingStatus || t.year ? (
            <Pill dot="var(--ok)" tone="var(--dim)">
              {[t.publishingStatus, t.year].filter(Boolean).join(" · ")}
            </Pill>
          ) : null}
        </p>
        <h1
          id="read-title-name"
          className="m-0 text-[clamp(42px,5vw,72px)] font-extralight leading-[0.95] tracking-[-0.05em]"
        >
          {name}
        </h1>
        {t.displayName && t.displayName !== t.name ? (
          <p className="m-0 text-sm text-[var(--muted)]">{t.name}</p>
        ) : null}
        {left != null && left > 0 ? (
          <p className="m-0 font-serif text-xl text-[#c9d1f6]">
            {left} {left === 1 ? "chapter" : "chapters"} to go.
          </p>
        ) : null}
        {t.genres.length ? (
          <div className="flex flex-wrap gap-1.5">
            {t.genres.map((g) => (
              <span
                key={g}
                className="rounded-full border border-white/[0.07] bg-white/[0.05] px-3 py-1 text-xs text-[var(--dim)]"
              >
                {g}
              </span>
            ))}
          </div>
        ) : null}
        {t.overview ? <p className="m-0 max-w-[62ch] text-[var(--dim)]">{t.overview}</p> : null}

        {d.progressChapters != null || d.listStatus ? (
          <div className="rounded-[18px] border border-white/[0.07] bg-black/30 px-[18px] py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="m-0 text-[34px] font-extralight leading-none tracking-[-0.04em]">
                Ch. {d.progressChapters ?? 0}
                {t.chapters != null ? (
                  <span className="text-sm tracking-normal text-[var(--faint)]"> of {t.chapters}</span>
                ) : null}
              </p>
              {summary ? <p className="m-0 font-mono text-[11px] text-[var(--muted)]">{summary}</p> : null}
            </div>
            {fraction != null ? (
              <TickScrubber value={fraction} label={`${name} progress`} className="mt-3.5" />
            ) : null}
            {pace ? <p className="mb-0 mt-2.5 text-[13px] text-[var(--muted)]">{pace}</p> : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2.5">
          {onLogChapter && next != null ? (
            <Button type="button" size="lg" disabled={logBusy} onClick={() => onLogChapter(next)}>
              {logBusy ? "Logging…" : `Log chapter ${next}`}
            </Button>
          ) : null}
          {anilist ? (
            <a
              href={anilist}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[46px] items-center rounded-full border border-white/[0.14] px-5 text-[var(--ink)] no-underline hover:border-white/30"
            >
              Open on AniList ↗
            </a>
          ) : null}
        </div>
        <p
          role="status"
          className={`m-0 min-h-[18px] text-[13px] ${logMessage?.tone === "error" ? "text-[var(--danger)]" : "text-[var(--ok)]"}`}
        >
          {logMessage?.text ?? ""}
        </p>
      </div>
    </section>
  );
};
