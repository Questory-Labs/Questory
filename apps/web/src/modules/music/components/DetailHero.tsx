import type { ReactNode } from "react";
import { Panel } from "@/components/ui";
import { Vinyl } from "./Vinyl";

export type HeroStat = { label: string; value: ReactNode; unit?: string };

export const DetailHero = ({
  eyebrow,
  title,
  titleId = "music-detail-title",
  subtitle,
  coverUrl,
  initial,
  genres = [],
  moods = [],
  stats = [],
  actions,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  titleId?: string;
  subtitle?: ReactNode;
  coverUrl?: string | null;
  initial?: string;
  genres?: string[];
  moods?: string[];
  stats?: HeroStat[];
  actions?: ReactNode;
}) => (
  <Panel size="lg" wrapperClassName="q-in [--i:1]" className="relative overflow-hidden p-0">
    <section
      aria-labelledby={titleId}
      className="relative flex min-h-[330px] flex-wrap items-end gap-6 p-7"
    >
      <div
        aria-hidden="true"
        className="absolute -inset-[10%] bg-[radial-gradient(55%_70%_at_72%_30%,hsla(345,40%,52%,0.45),transparent_62%),radial-gradient(40%_50%_at_25%_75%,hsla(260,20%,40%,0.3),transparent_70%),#0d0d0e]"
      />
      <div
        aria-hidden="true"
        className="q-twinkle absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.9)_0.9px,transparent_1.4px)] [background-size:6px_6px] opacity-65 [mask-image:radial-gradient(50%_75%_at_74%_32%,#000_20%,transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(0deg,rgba(9,9,10,0.95),rgba(9,9,10,0.2)_60%,transparent)]"
      />
      {actions ? (
        <div className="absolute right-5 top-5 z-[1] flex flex-wrap items-center justify-end gap-2">
          {actions}
        </div>
      ) : null}
      <Vinyl coverUrl={coverUrl} initial={initial} />
      <div className="relative min-w-0 flex-[1_1_360px]">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--music)]">
          <span
            aria-hidden="true"
            className="h-[5px] w-[5px] rounded-full bg-[var(--music)] shadow-[0_0_8px_rgba(240,168,184,0.8)]"
          />
          {eyebrow}
        </p>
        <h1
          id={titleId}
          className="mt-3 break-words text-[clamp(44px,5.4vw,76px)] font-extralight leading-[0.95] tracking-[-0.045em]"
        >
          {title}
        </h1>
        {subtitle ? (
          <div className="mt-2 text-base text-[var(--muted)]">{subtitle}</div>
        ) : null}
        {genres.length + moods.length > 0 ? (
          <ul className="mt-3.5 flex flex-wrap gap-1.5 text-xs">
            {genres.map((g) => (
              <li
                key={`g-${g}`}
                className="rounded-full border border-white/[0.12] bg-[rgba(10,10,11,0.6)] px-[11px] py-1 text-[var(--muted)] backdrop-blur-sm"
              >
                {g}
              </li>
            ))}
            {moods.map((m) => (
              <li
                key={`m-${m}`}
                className="rounded-full border border-[rgba(240,168,184,0.25)] bg-[rgba(240,168,184,0.1)] px-[11px] py-1 text-[#f5ccd6] backdrop-blur-sm"
              >
                mood: <span className="font-serif text-sm">{m}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {stats.length > 0 ? (
        <dl className="relative m-0 flex flex-[0_1_auto] gap-7">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-xs text-[var(--muted)]">{s.label}</dt>
              <dd className="mt-0.5 text-[48px] font-extralight leading-none tracking-[-0.04em]">
                {s.value}
                {s.unit ? (
                  <span className="text-sm tracking-normal text-[var(--muted)]">{s.unit}</span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  </Panel>
);
