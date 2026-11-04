"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { MusicChip } from "@/components/music/MusicChip";
import { MusicCover } from "@/components/music/MusicCover";
import { OverflowMarquee, Panel } from "@/components/ui";
import { formatListenRowTime } from "@/lib/music";
import type { ListenDayGroup as DayGroup } from "@/lib/music";
import type { MusicRecentListen } from "@questorylabs/shared";
import { LISTEN_SOURCE_OPTIONS } from "../../music.utils";
import { listenSourceOf } from "../music.listening.utils";

const sourceLabel = (client: string | null | undefined) => {
  const source = listenSourceOf(client);
  return LISTEN_SOURCE_OPTIONS.find((o) => o.value === source)?.label ?? source;
};

export const ListenDayGroup = ({
  group,
  summary,
  index = 0,
}: {
  group: DayGroup<MusicRecentListen>;
  summary?: string | null;
  index?: number;
}) => (
  <div className="q-in" style={{ "--i": index + 2 } as CSSProperties}>
    <Panel className="px-2.5 pb-2 pt-4">
    <section aria-label={group.label}>
      <div className="mx-2.5 mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[17px] font-normal">{group.label}</h2>
        {summary ? (
          <span className="font-mono text-[11px] text-[var(--faint)]">{summary}</span>
        ) : null}
      </div>
      <ul className="m-0 list-none p-0">
        {group.items.map((row) => (
          <li
            key={row.id}
            className="q-row grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] px-2.5 py-2 sm:grid-cols-[40px_minmax(0,1fr)_110px_70px]"
          >
            <MusicCover src={row.track.imageUrl} alt="" size="sm" />
            <div className="min-w-0">
              <OverflowMarquee className="text-[15px] text-[var(--ink)]">
                <Link
                  href={`/music/tracks/${row.track.id}`}
                  className="hover:text-[var(--music)]"
                >
                  {row.track.title}
                </Link>
              </OverflowMarquee>
              <OverflowMarquee className="mt-0.5 text-[13px] text-[var(--muted)]">
                {row.track.artistId ? (
                  <Link
                    href={`/music/artists/${row.track.artistId}`}
                    className="hover:text-[var(--ink)]"
                  >
                    {row.track.artistName}
                  </Link>
                ) : (
                  <span>{row.track.artistName}</span>
                )}
                {row.track.releaseTitle ? (
                  <>
                    {" · "}
                    {row.track.releaseId ? (
                      <Link
                        href={`/music/albums/${row.track.releaseId}`}
                        className="font-serif text-[15px] hover:text-[var(--ink)]"
                      >
                        {row.track.releaseTitle}
                      </Link>
                    ) : (
                      <em className="font-serif text-[15px]">{row.track.releaseTitle}</em>
                    )}
                  </>
                ) : null}
              </OverflowMarquee>
              {row.musicService || row.mediaPlayer || row.track.genres.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {row.musicService ? <MusicChip>{row.musicService}</MusicChip> : null}
                  {row.mediaPlayer ? <MusicChip>{row.mediaPlayer}</MusicChip> : null}
                  {row.track.genres.slice(0, 2).map((g) => (
                    <MusicChip key={g}>{g}</MusicChip>
                  ))}
                </div>
              ) : null}
            </div>
            <span className="hidden truncate font-mono text-[11px] text-[var(--faint)] sm:block">
              {sourceLabel(row.submissionClient)}
            </span>
            <span className="text-right font-mono text-[11px] text-[var(--muted)]">
              {formatListenRowTime(row.listenedAt)}
            </span>
          </li>
        ))}
      </ul>
    </section>
    </Panel>
  </div>
);
