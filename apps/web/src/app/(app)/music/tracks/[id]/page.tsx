"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  MusicRange,
  MusicTimeBucket,
  MusicTrackDetail,
  MusicTrackListenPage,
} from "@questorylabs/shared";
import { MusicChip } from "@/components/music/MusicChip";
import { MusicCorrectionEdit } from "@/components/music/MusicCorrectionEdit";
import { MusicCover } from "@/components/music/MusicCover";
import { MusicRangePicker } from "@/components/music/MusicRangePicker";
import { StatCard } from "@/components/StatCard";
import { Button, PageHeader, Panel, StateMessage } from "@/components/ui";
import { withTz } from "@/lib/dates";
import { formatListenDateTime, formatMinutes, musicFetch } from "@/lib/music";

const PAGE_SIZE = 20;
const TOOLTIP_INK = "#f2efe8";

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

function chartTooltipStyle() {
  return {
    background: "#1f1f24",
    border: "1px solid rgba(242, 239, 232, 0.12)",
    borderRadius: 8,
    color: TOOLTIP_INK,
    fontSize: 12,
  };
}

function MiniBar({
  title,
  data,
}: {
  title: string;
  data: { label: string; count: number }[];
}) {
  return (
    <Panel className="p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
        {title}
      </h2>
      {data.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">No listens in this range.</p>
      ) : (
        <div className="mt-3 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
            >
              <XAxis
                dataKey="label"
                stroke="var(--faint)"
                fontSize={10}
                interval={0}
                angle={data.length > 12 ? -40 : 0}
                textAnchor={data.length > 12 ? "end" : "middle"}
                height={data.length > 12 ? 48 : 28}
              />
              <YAxis stroke="var(--faint)" fontSize={10} width={32} />
              <Tooltip
                contentStyle={chartTooltipStyle()}
                itemStyle={{ color: TOOLTIP_INK }}
                labelStyle={{ color: TOOLTIP_INK, fontWeight: 600 }}
              />
              <Bar dataKey="count" fill="var(--accent)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

export default function MusicTrackPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const [range, setRange] = useState<MusicRange>("all");
  const [page, setPage] = useState(1);

  const detail = useQuery({
    queryKey: ["music-track", id, range],
    queryFn: () =>
      musicFetch<MusicTrackDetail>(
        withTz(`/analytics/tracks/${id}?range=${range}`),
      ),
    enabled: Boolean(id),
  });

  const listens = useQuery({
    queryKey: ["music-track-listens", id, range, page],
    queryFn: () =>
      musicFetch<MusicTrackListenPage>(
        `/analytics/tracks/${id}/listens?range=${range}&page=${page}&pageSize=${PAGE_SIZE}`,
      ),
    enabled: Boolean(id),
  });

  const hourSeries = useQuery({
    queryKey: ["music-track-hour", id, range],
    queryFn: () =>
      musicFetch<MusicTimeBucket[]>(
        withTz(
          `/analytics/tracks/${id}/timeseries?granularity=hourOfDay&range=${range}`,
        ),
      ),
    enabled: Boolean(id),
  });

  const dowSeries = useQuery({
    queryKey: ["music-track-dow", id, range],
    queryFn: () =>
      musicFetch<MusicTimeBucket[]>(
        withTz(
          `/analytics/tracks/${id}/timeseries?granularity=dayOfWeek&range=${range}`,
        ),
      ),
    enabled: Boolean(id),
  });

  const save = useMutation({
    mutationFn: (values: {
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
      qc.invalidateQueries({ queryKey: ["music-track"] });
      qc.invalidateQueries({ queryKey: ["music-track-listens"] });
      qc.invalidateQueries({ queryKey: ["music-recent"] });
      if (result?.trackId && result.trackId !== id) {
        window.location.href = `/music/tracks/${result.trackId}`;
      }
    },
  });

  const t = detail.data?.track;
  const title = t ? displayLabel(t.userDisplayName, t.title) : "Track";

  const hourData = useMemo(
    () =>
      (hourSeries.data || []).map((b) => ({
        label: b.label,
        count: b.count,
      })),
    [hourSeries.data],
  );
  const dowData = useMemo(
    () =>
      (dowSeries.data || []).map((b) => ({
        label: b.label,
        count: b.count,
      })),
    [dowSeries.data],
  );

  const total = listens.data?.total ?? 0;
  const pageSize = listens.data?.pageSize ?? PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const listenItems = listens.data?.items ?? [];

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
                saving={save.isPending}
                onSave={async (values) => save.mutateAsync(values)}
                onSaved={() => {
                  qc.invalidateQueries({ queryKey: ["music-track", id] });
                }}
              />
            ) : null}
          </>
        }
      />

      {detail.isLoading && (
        <StateMessage variant="loading">Loading track…</StateMessage>
      )}
      {detail.isError && (
        <StateMessage variant="error">Track not found.</StateMessage>
      )}

      {detail.data && t && (
        <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
          <MusicCover src={t.imageUrl} alt={title} size="lg" />
          <div>
            {t.userDisplayName && t.userDisplayName !== t.title ? (
              <p className="text-sm text-[var(--muted)] pb-4">{t.title}</p>
            ) : null}

            <div className="grid grid-cols-4 gap-3">
              <StatCard label="Listens" value={detail.data.listenCount} />
              <StatCard
                label="Listening time"
                value={
                  detail.data.listeningMinutes > 0
                    ? formatMinutes(detail.data.listeningMinutes)
                    : "—"
                }
                hint={
                  t.durationMs
                    ? "Estimated from track length"
                    : undefined
                }
              />
              {detail.data.peakDow ? (
                <StatCard
                  label="Peak day"
                  value={detail.data.peakDow.label}
                  hint={`${detail.data.peakDow.count} listens`}
                />
              ) : null}
              {detail.data.peakHour ? (
                <StatCard
                  label="Peak hour"
                  value={detail.data.peakHour.label}
                  hint={`${detail.data.peakHour.count} listens`}
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
              <MiniBar title="Day of week" data={dowData} />
              <MiniBar title="Hour of day" data={hourData} />
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
              {listens.isLoading && listenItems.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--muted)]">Loading…</p>
              ) : null}
              {!listens.isLoading && listenItems.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--muted)]">
                  No listens in this range.
                </p>
              ) : null}

              {total > pageSize ? (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <Button
                    variant="secondary"
                    disabled={page <= 1 || listens.isFetching}
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
                    disabled={page >= totalPages || listens.isFetching}
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
