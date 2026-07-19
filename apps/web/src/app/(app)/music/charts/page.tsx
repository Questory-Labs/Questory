"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type {
  MusicBreakdownResponse,
  MusicRange,
  MusicTopsResponse,
} from "@questorylabs/shared";
import { MusicCover } from "@/components/music/MusicCover";
import { MusicRangePicker } from "@/components/music/MusicRangePicker";
import { PageHeader, Panel, StateMessage } from "@/components/ui";
import { formatShare, musicFetch } from "@/lib/music";

type TopsKind = "artists" | "albums" | "tracks" | "genres" | "moods";

const KINDS: { value: TopsKind; label: string }[] = [
  { value: "artists", label: "Artists" },
  { value: "albums", label: "Albums" },
  { value: "tracks", label: "Tracks" },
  { value: "genres", label: "Genres" },
  { value: "moods", label: "Moods" },
];

function entityHref(kind: TopsKind, id: string): string | null {
  if (kind === "artists") return `/music/artists/${id}`;
  if (kind === "albums") return `/music/albums/${id}`;
  if (kind === "tracks") return `/music/tracks/${id}`;
  return null;
}

function parseKind(raw: string | null): TopsKind {
  if (KINDS.some((k) => k.value === raw)) return raw as TopsKind;
  return "artists";
}

function MusicChartsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [range, setRange] = useState<MusicRange>("week");
  const kind = parseKind(searchParams.get("kind"));

  function setKind(next: TopsKind) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("kind", next);
    router.replace(`/music/charts?${params.toString()}`, { scroll: false });
  }

  const tops = useQuery({
    queryKey: ["music-tops", kind, range],
    queryFn: () =>
      musicFetch<MusicTopsResponse>(
        `/analytics/tops/${kind}?range=${range}&limit=25`,
      ),
  });

  const years = useQuery({
    queryKey: ["music-breakdown-years", range],
    queryFn: () =>
      musicFetch<MusicBreakdownResponse>(
        `/analytics/breakdown/years?range=${range}&limit=12`,
      ),
  });

  const services = useQuery({
    queryKey: ["music-breakdown-services", range],
    queryFn: () =>
      musicFetch<MusicBreakdownResponse>(
        `/analytics/breakdown/services?range=${range}&limit=8`,
      ),
  });

  const periodListens = tops.data?.periodListens ?? 0;
  const items = tops.data?.items ?? [];

  const rangeLabel = useMemo(() => {
    const map: Record<MusicRange, string> = {
      day: "Last 24 hours",
      week: "Last 7 days",
      month: "Last 30 days",
      year: "Last 365 days",
      all: "All time",
    };
    return map[range];
  }, [range]);

  return (
    <>
      <PageHeader
        title="Top charts"
        description={rangeLabel}
        actions={<MusicRangePicker value={range} onChange={setRange} />}
      />

      <div
        className="mb-6 flex flex-wrap gap-1 border-b border-[var(--line)] pb-3"
        role="tablist"
        aria-label="Chart type"
      >
        {KINDS.map((k) => {
          const active = k.value === kind;
          return (
            <button
              key={k.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setKind(k.value)}
              className={`px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] ${
                active
                  ? "text-[var(--ink)] underline decoration-[var(--accent)] underline-offset-8"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {k.label}
            </button>
          );
        })}
      </div>

      {tops.isLoading && (
        <StateMessage variant="loading">Loading charts…</StateMessage>
      )}
      {tops.isError && (
        <StateMessage variant="error">Could not load charts.</StateMessage>
      )}

      {!tops.isLoading && items.length === 0 && (
        <p className="text-sm text-[var(--muted)]">No listens in this range.</p>
      )}

      <ol className="space-y-2">
        {items.map((item, i) => {
          const href = entityHref(kind, item.id);
          const name = item.name || item.title || "—";
          const row = (
            <>
              <span className="w-6 shrink-0 font-mono text-[var(--faint)]">
                {i + 1}.
              </span>
              {(kind === "artists" ||
                kind === "albums" ||
                kind === "tracks") && (
                <MusicCover src={item.imageUrl} alt="" size="sm" />
              )}
              <span className="min-w-0 flex-1 truncate text-[var(--ink)]">
                {name}
                {item.artistName ? (
                  <span className="text-[var(--muted)]">
                    {" "}
                    · {item.artistName}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 font-mono text-[11px] text-[var(--faint)]">
                {formatShare(item.count, periodListens)}
              </span>
              <span className="w-10 shrink-0 text-right font-mono text-[11px] text-[var(--muted)]">
                {item.count}
              </span>
            </>
          );
          return (
            <li key={item.id}>
              {href ? (
                <Link
                  href={href}
                  className="flex items-center gap-3 border-b border-[var(--line)] py-2 text-sm hover:bg-[var(--bg-1)]"
                >
                  {row}
                </Link>
              ) : (
                <div className="flex items-center gap-3 border-b border-[var(--line)] py-2 text-sm">
                  {row}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <Panel className="p-4">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
            Release years
          </h2>
          {years.isLoading ? (
            <StateMessage variant="loading" className="mt-3">
              Loading…
            </StateMessage>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {(years.data?.items || []).map((item) => (
                <li
                  key={item.key}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="text-[var(--ink)]">{item.label}</span>
                  <span className="font-mono text-[11px] text-[var(--faint)]">
                    {item.count}
                    {years.data
                      ? ` · ${formatShare(item.count, years.data.periodListens)}`
                      : ""}
                  </span>
                </li>
              ))}
              {(years.data?.items || []).length === 0 ? (
                <li className="text-sm text-[var(--muted)]">No year data yet.</li>
              ) : null}
            </ul>
          )}
        </Panel>

        <Panel className="p-4">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
            Sources
          </h2>
          {services.isLoading ? (
            <StateMessage variant="loading" className="mt-3">
              Loading…
            </StateMessage>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {(services.data?.items || []).map((item) => (
                <li
                  key={item.key}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="text-[var(--ink)]">{item.label}</span>
                  <span className="font-mono text-[11px] text-[var(--faint)]">
                    {item.count}
                    {services.data
                      ? ` · ${formatShare(item.count, services.data.periodListens)}`
                      : ""}
                  </span>
                </li>
              ))}
              {(services.data?.items || []).length === 0 ? (
                <li className="text-sm text-[var(--muted)]">
                  No source metadata yet.
                </li>
              ) : null}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

export default function MusicChartsPage() {
  return (
    <Suspense
      fallback={<StateMessage variant="loading">Loading charts…</StateMessage>}
    >
      <MusicChartsInner />
    </Suspense>
  );
}
