"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { useState } from "react";
import type { WatchRange, WatchTitleDetail } from "@questorylabs/shared";
import { EntityMetadataEdit } from "@/components/EntityMetadataEdit";
import { WatchRangePicker } from "@/components/watch/WatchRangePicker";
import { PageHeader, SkeletonDetailHeader, StateMessage } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatYourWatchRating, watchFetch } from "@/lib/watch";

function displayLabel(
  displayName: string | null | undefined,
  name: string,
): string {
  return displayName?.trim() || name;
}

export default function WatchTitlePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const store = useStore();
  const [range, setRange] = useState<WatchRange>("all");

  const detail = useResource({
    id: ["watch-title", id, range],
    load: () =>
      watchFetch<WatchTitleDetail>(
        `/analytics/titles/${id}?range=${range}`,
      ),
    when: Boolean(id),
  });

  const save = useAction({
    run: (values: { displayName: string; coverUrl: string }) =>
      watchFetch(`/catalog/titles/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          displayName: values.displayName.trim() || null,
          posterUrl: values.coverUrl.trim() || null,
        }),
      }),
    onSuccess: () => {
      store.touch(["watch-title", id]);
    },
  });

  const t = detail.value?.title;
  const title = t ? displayLabel(t.displayName, t.name) : "Title";

  return (
    <>
      <PageHeader
        eyebrow={t?.type === "show" ? "Show" : "Movie"}
        title={title}
        description={
          detail.value
            ? [
                `${detail.value.eventCount} watches in range · first ${formatDate(detail.value.firstWatchAt)} · latest ${formatDate(detail.value.latestWatchAt)}`,
                detail.value.userRating != null
                  ? formatYourWatchRating(detail.value.userRating)
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")
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
                saving={save.busy}
                onSave={async (values) => {
                  await save.submitAsync(values);
                }}
              />
            ) : null}
          </>
        }
      />

      {detail.empty && <SkeletonDetailHeader />}
      {detail.failed && (
        <StateMessage variant="error">Title not found.</StateMessage>
      )}

      {detail.value && t && (
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

            {t.type === "show" && detail.value.topEpisodes.length > 0 ? (
              <section className="mt-8">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
                  Top episodes
                </h2>
                <ol className="mt-3 space-y-2">
                  {detail.value.topEpisodes.map((ep, i) => (
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
              {detail.value.recentEvents.length > 0 ? (
                <ul className="mt-3 divide-y divide-[var(--line)]">
                  {detail.value.recentEvents.map((e) => (
                    <li
                      key={e.id}
                      className="py-2 font-mono text-[12px] text-[var(--muted)]"
                    >
                      {formatDateTime(e.watchedAt)}
                      {e.rating != null
                        ? ` · ${formatYourWatchRating(e.rating)}`
                        : ""}
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
