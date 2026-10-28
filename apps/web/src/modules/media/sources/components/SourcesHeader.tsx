import type { SourcesOverview } from "@questorylabs/shared";
import type { SourcesTab } from "../media.sources.types";
import { SOURCES_ACCENT, SOURCES_NOUN } from "../media.sources.utils";

const TAB_WIDTH = 96;

export const SourcesHeader = ({
  tabs,
  tab,
  overview,
  onTabChange,
}: {
  tabs: { value: SourcesTab; label: string }[];
  tab: SourcesTab;
  overview?: SourcesOverview;
  onTabChange: (tab: SourcesTab) => void;
}) => {
  const index = Math.max(0, tabs.findIndex((t) => t.value === tab));
  const count = (domain: SourcesTab) => overview?.domains.find((d) => d.domain === domain)?.connected;

  return (
    <header className="q-in flex flex-wrap items-end justify-between gap-4 px-1 pb-1 pt-2">
      <div>
        {overview ? (
          <p className="m-0 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--faint)]">
            <span aria-hidden="true" className="q-live h-[5px] w-[5px] rounded-full bg-[var(--ok)]" />
            {overview.connected} connected · {tabs.map((t) => t.value).join(", ")}
          </p>
        ) : null}
        <h1 className="mt-1.5 text-[clamp(34px,4vw,52px)] font-light leading-none tracking-[-0.035em] text-[var(--ink)]">
          Where your{" "}
          <em className="font-serif font-normal italic" style={{ color: SOURCES_ACCENT[tab] }}>
            {SOURCES_NOUN[tab]}
          </em>{" "}
          comes from
        </h1>
        <p className="mt-2.5 text-[var(--muted)]">Connect once; Questory keeps it in sync.</p>
      </div>
      {tabs.length > 1 ? (
        <div
          role="tablist"
          aria-label="Module"
          className="relative grid rounded-full border border-white/[0.07] bg-white/[0.04] p-1"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, ${TAB_WIDTH}px)` }}
        >
          <span
            aria-hidden="true"
            className="q-slide absolute inset-y-1 left-1 rounded-full bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
            style={{ width: TAB_WIDTH, transform: `translateX(${index * TAB_WIDTH}px)` }}
          />
          {tabs.map((t) => {
            const active = t.value === tab;
            const n = count(t.value);
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(t.value)}
                className="relative inline-flex min-h-[38px] items-center justify-center gap-[7px] border-0 bg-transparent text-sm"
                style={{ color: active ? "var(--ink)" : "var(--muted)" }}
              >
                <span
                  aria-hidden="true"
                  className="h-[5px] w-[5px] rounded-full"
                  style={{ background: SOURCES_ACCENT[t.value] }}
                />
                {t.label}
                {n !== undefined ? <span className="font-mono text-[10px] text-[var(--faint)]">{n}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </header>
  );
};
