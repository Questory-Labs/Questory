"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { WatchRange, WatchTitleDetail } from "@questorylabs/shared";
import { EntityMetadataEdit } from "@/components/EntityMetadataEdit";
import { WatchRangePicker } from "@/components/watch/WatchRangePicker";
import { PageHeader, StateMessage } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/dates";
import { watchFetch } from "@/lib/watch";

function displayLabel(
  displayName: string | null | undefined,
  name: string,
): string {
  return displayName?.trim() || name;
}

export default function WatchTitlePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const [range, setRange] = useState<WatchRange>("all");

  const detail = useQuery({
    queryKey: ["watch-title", id, range],
    queryFn: () =>
      watchFetch<WatchTitleDetail>(
        `/analytics/titles/${id}?range=${range}`,
      ),
    enabled: Boolean(id),
  });

  const save = useMutation({
    mutationFn: (values: { displayName: string; coverUrl: string }) =>
      watchFetch(`/catalog/titles/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          displayName: values.displayName.trim() || null,
          posterUrl: values.coverUrl.trim() || null,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watch-title", id] });
    },
  });

  const t = detail.data?.title;
  const title = t ? displayLabel(t.displayName, t.name) : "Title";

  return (
    <>
      <PageHeader
        eyebrow={t?.type === "show" ? "Show" : "Movie"}
        title={title}
        description={
          detail.data
            ? `${detail.data.eventCount} watches in range · first ${formatDate(detail.data.firstWatchAt)} · latest ${formatDate(detail.data.latestWatchAt)}`
            : undefined
        }
        actions={
          <>
            <WatchRangePicker value={range} onChange={setRange} />
            {t ? (
              <EntityMetadataEdit
                initialDisplayName={t.displayName}
                initialCoverUrl={t.posterUrl}
                canonicalName={t.name}
                coverLabel="Poster URL"
                saving={save.isPending}
                onSave={async (values) => {
                  await save.mutateAsync(values);
                }}
              />
            ) : null}
          </>
        }
      />

      {detail.isLoading && (
        <StateMessage variant="loading">Loading title…</StateMessage>
      )}
      {detail.isError && (
        <StateMessage variant="error">Title not found.</StateMessage>
      )}

      {detail.data && t && (
        <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
          {t.posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={t.posterUrl}
              alt={title}
              className="h-72 w-48 object-cover"
            />
          ) : (
            <div className="h-72 w-48 bg-[var(--bg-1)]" />
          )}
          <div>
            {t.displayName && t.displayName !== t.name ? (
              <p className="text-sm text-[var(--muted)]">{t.name}</p>
            ) : null}
            {t.year ? (
              <p className="mt-1 text-sm text-[var(--muted)]">{t.year}</p>
            ) : null}
            {t.overview ? (
              <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
                {t.overview}
              </p>
            ) : null}

            {t.genres.length > 0 ? (
              <p className="mt-4 text-sm text-[var(--muted)]">
                {t.genres.join(" · ")}
              </p>
            ) : null}

            {t.type === "show" && detail.data.topEpisodes.length > 0 ? (
              <section className="mt-8">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
                  Top episodes
                </h2>
                <ol className="mt-3 space-y-2">
                  {detail.data.topEpisodes.map((ep, i) => (
                    <li
                      key={ep.id}
                      className="flex items-center justify-between border-b border-[var(--line)] py-2 text-sm"
                    >
                      <span>
                        {i + 1}. S{ep.seasonNumber}E{ep.episodeNumber}
                        {ep.name ? ` · ${ep.name}` : ""}
                      </span>
                      <span className="font-mono text-[11px] text-[var(--faint)]">
                        {ep.count}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            <section className="mt-8">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
                Recent watches
              </h2>
              {detail.data.recentEvents.length > 0 ? (
                <ul className="mt-3 divide-y divide-[var(--line)]">
                  {detail.data.recentEvents.map((e) => (
                    <li
                      key={e.id}
                      className="py-2 font-mono text-[12px] text-[var(--muted)]"
                    >
                      {formatDateTime(e.watchedAt)}
                      {e.episode
                        ? ` · S${e.episode.seasonNumber}E${e.episode.episodeNumber}`
                        : ""}
                      {` · ${e.source}`}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-[var(--muted)]">
                  No watches in this range.
                </p>
              )}
            </section>

            <p className="mt-8 text-sm text-[var(--muted)]">
              <Link href="/watch/history" className="hover:text-[var(--accent)]">
                ← Back to history
              </Link>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
