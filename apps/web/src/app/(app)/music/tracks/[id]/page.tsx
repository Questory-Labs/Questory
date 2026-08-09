"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import {
  MusicRange,
  MusicTimeBucket,
  MusicTrackDetail,
  MusicTrackListenPage,
} from "@questorylabs/shared";
import { SketchChartPanel } from "@/components/charts/SketchChartPanel";
import { MusicChip } from "@/components/music/MusicChip";
import { MusicCorrectionEdit } from "@/components/music/MusicCorrectionEdit";
import { MusicCover } from "@/components/music/MusicCover";
import { MusicRangePicker } from "@/components/music/MusicRangePicker";
import { StatCard } from "@/components/StatCard";
import { Button, PageHeader, Panel, SkeletonDetailHeader, StateMessage } from "@/components/ui";
import { withTz } from "@/lib/dates";
import { formatListenDateTime, formatMinutes, musicFetch } from "@/lib/music";
import { MUSIC_DETAIL_LISTENS_PAGE_SIZE } from "@/lib/pagination";

function displayLabel(
  userDisplayName: string | null | undefined,
  title: string,
): string {
  return userDisplayName?.trim() || title;
}

function ArtistLinks({
  artists,
  fallbackArtistId,
  fallbackArtistName,
}: {
  artists?: Array<{ id: string; name: string; userDisplayName?: string | null }>;
  fallbackArtistId: string;
  fallbackArtistName: string;
}) {
  const list =
    artists && artists.length > 0
      ? artists
      : [{ id: fallbackArtistId, name: fallbackArtistName }];
  return (
    <>
      {list.map((a, i) => (
        <span key={a.id}>
          {i > 0 ? ", " : null}
          <Link
            href={`/music/artists/${a.id}`}
            className="hover:text-[var(--accent)]"
          >
            {a.userDisplayName?.trim() || a.name}
          </Link>
        </span>
      ))}
    </>
  );
}

export default function MusicTrackPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const store = useStore();
  const [range, setRange] = useState<MusicRange>("all");
  const [page, setPage] = useState(1);

  const detail = useResource({
    id: ["music-track", id, range],
    load: () =>
      musicFetch<MusicTrackDetail>(
        withTz(`/analytics/tracks/${id}?range=${range}`),
      ),
    when: Boolean(id),
  });

  const listens = useResource({
    id: ["music-track-listens", id, range, page],
    load: () =>
      musicFetch<MusicTrackListenPage>(
        `/analytics/tracks/${id}/listens?range=${range}&page=${page}&pageSize=${MUSIC_DETAIL_LISTENS_PAGE_SIZE}`,
      ),
    when: Boolean(id),
  });

  const hourSeries = useResource({
    id: ["music-track-hour", id, range],
    load: () =>
      musicFetch<MusicTimeBucket[]>(
        withTz(
          `/analytics/tracks/${id}/timeseries?granularity=hourOfDay&range=${range}`,
        ),
      ),
    when: Boolean(id),
  });

  const dowSeries = useResource({
    id: ["music-track-dow", id, range],
    load: () =>
      musicFetch<MusicTimeBucket[]>(
        withTz(
          `/analytics/tracks/${id}/timeseries?granularity=dayOfWeek&range=${range}`,
        ),
      ),
    when: Boolean(id),
  });

  const save = useAction({
    run: (values: {
      trackTitle?: string;
      albumTitle?: string | null;
      artists?: Array<{ id?: string; name: string }>;
      displayName?: string | null;
    }) =>
      musicFetch<{ ok: boolean; reassigned?: boolean; trackId?: string }>(
        `/corrections/tracks/${id}`,
        {
          method: "PUT",
          body: JSON.stringify(values),
        },
      ),
    onSuccess: (result) => {
      store.touch(["music-track"]);
      store.touch(["music-track-listens"]);
      store.touch(["music-recent"]);
      if (result?.trackId && result.trackId !== id) {
        window.location.href = `/music/tracks/${result.trackId}`;
      }
    },
  });

  const merge = useAction({
    run: (targetTrackId: string) =>
      musicFetch<{ ok: boolean; trackId: string; mergedListenCount: number }>(
        `/corrections/tracks/${id}/merge`,
        {
          method: "POST",
          body: JSON.stringify({ targetTrackId }),
        },
      ),
    onSuccess: (result) => {
      store.touch(["music-track"]);
      store.touch(["music-track-listens"]);
      store.touch(["music-recent"]);
      if (result.trackId) {
        window.location.href = `/music/tracks/${result.trackId}`;
      }
    },
  });

  const t = detail.value?.track;
  const title = t ? displayLabel(t.userDisplayName, t.title) : "Track";

  const hourData = useMemo(
    () =>
      (hourSeries.value || []).map((b) => ({
        label: b.label,
        count: b.count,
      })),
    [hourSeries.value],
  );
  const dowData = useMemo(
    () =>
      (dowSeries.value || []).map((b) => ({
        label: b.label,
        count: b.count,
      })),
    [dowSeries.value],
  );

  const total = listens.value?.total ?? 0;
  const pageSize = listens.value?.pageSize ?? MUSIC_DETAIL_LISTENS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const listenItems = listens.value?.items ?? [];

  const handleRangeChange = (next: MusicRange) => {
    setRange(next);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        eyebrow="Track"
        title={title}
        description={
          t ? (
            <>
              <ArtistLinks
                artists={t.artists}
                fallbackArtistId={t.artistId}
                fallbackArtistName={t.artistName}
              />
              {t.releaseTitle ? (
                <>
                  {" · "}
                  {t.releaseId ? (
                    <Link
                      href={`/music/albums/${t.releaseId}`}
                      className="hover:text-[var(--accent)]"
                    >
                      {t.releaseTitle}
                    </Link>
                  ) : (
                    t.releaseTitle
                  )}
                </>
              ) : null}
            </>
          ) : undefined
        }
        actions={
          <>
            <MusicRangePicker value={range} onChange={handleRangeChange} />
            {t ? (
              <MusicCorrectionEdit
                kind="track"
                entityId={id}
                saving={save.busy}
                merging={merge.busy}
                onSave={async (values) => save.submitAsync(values)}
                onMerge={async (targetTrackId) => merge.submitAsync(targetTrackId)}
                onSaved={() => {
                  store.touch(["music-track", id]);
                }}
              />
            ) : null}
          </>
        }
      />

      {detail.empty && <SkeletonDetailHeader />}
      {detail.failed && (
        <StateMessage variant="error">Track not found.</StateMessage>
      )}

      {detail.value && t && (
        <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
          <MusicCover src={t.imageUrl} alt={title} size="lg" />
          <div>
            {t.userDisplayName && t.userDisplayName !== t.title ? (
              <p className="text-sm text-[var(--muted)] pb-4">{t.title}</p>
            ) : null}

            <div className="grid grid-cols-4 gap-3">
              <StatCard label="Listens" value={detail.value.listenCount} />
              <StatCard
                label="Listening time"
                value={
                  detail.value.listeningMinutes > 0
                    ? formatMinutes(detail.value.listeningMinutes)
                    : "—"
                }
                hint={
                  t.durationMs
                    ? "Estimated from track length"
                    : undefined
                }
              />
              {detail.value.peakDow ? (
                <StatCard
                  label="Peak day"
                  value={detail.value.peakDow.label}
                  hint={`${detail.value.peakDow.count} listens`}
                />
              ) : null}
              {detail.value.peakHour ? (
                <StatCard
                  label="Peak hour"
                  value={detail.value.peakHour.label}
                  hint={`${detail.value.peakHour.count} listens`}
                />
              ) : null}
            </div>

            {t.genres.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {t.genres.map((g) => (
                  <MusicChip key={`${g.name}-${g.source}`}>{g.name}</MusicChip>
                ))}
              </div>
            ) : null}

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <SketchChartPanel
                title="Day of week"
                data={dowData}
                valueLabel="listens"
                emptyMessage="No listens in this range."
              />
              <SketchChartPanel
                title="Hour of day"
                data={hourData}
                valueLabel="listens"
                emptyMessage="No listens in this range."
              />
            </div>

            <section className="mt-8">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
                Recent listens
                {total > 0 ? ` · ${total.toLocaleString()}` : ""}
              </h2>
              <ul className="mt-3 divide-y divide-[var(--line)]">
                {listenItems.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-baseline justify-between gap-3 py-2"
                  >
                    <span className="font-mono text-[12px] text-[var(--muted)]">
                      {formatListenDateTime(row.listenedAt)}
                    </span>
                    {row.musicService || row.mediaPlayer ? (
                      <span className="font-mono text-[10px] text-[var(--faint)]">
                        {[row.musicService, row.mediaPlayer]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
              {listens.empty && listenItems.length === 0 ? (
                <StateMessage variant="loading" className="mt-3" />
              ) : null}
              {!listens.empty && listenItems.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--muted)]">
                  No listens in this range.
                </p>
              ) : null}

              {total > pageSize ? (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <Button
                    variant="secondary"
                    disabled={page <= 1 || listens.refreshing}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5"
                  >
                    Previous
                  </Button>
                  <span className="font-mono text-xs text-[var(--muted)]">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    disabled={page >= totalPages || listens.refreshing}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5"
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </section>

            <p className="mt-8 text-sm text-[var(--muted)]">
              <Link
                href="/music/listening"
                className="hover:text-[var(--accent)]"
              >
                ← Back to listening
              </Link>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
