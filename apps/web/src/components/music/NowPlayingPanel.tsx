"use client";

import Link from "next/link";
import { MusicCover } from "@/components/music/MusicCover";
import { OverflowMarquee, Panel } from "@/components/ui";
import type { MusicPlayingNow } from "@questorylabs/shared";

type PlayingTrack = NonNullable<MusicPlayingNow>["track"];

export const NowPlayingPanel = ({
  track,
  wrapperClassName = "mb-8",
}: {
  track: PlayingTrack;
  wrapperClassName?: string;
}) => (
  <Panel wrapperClassName={wrapperClassName} className="flex items-center gap-4 p-4">
    <MusicCover src={track.imageUrl} alt="" size="md" />
    <div className="min-w-0">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
        Now playing
      </p>
      <OverflowMarquee className="mt-1 text-[var(--ink)]">
        <Link
          href={`/music/tracks/${track.id}`}
          className="hover:text-[var(--accent)]"
        >
          {track.title}
        </Link>
      </OverflowMarquee>
      <Link
        href={`/music/artists/${track.artistId}`}
        className="text-sm text-[var(--muted)] hover:text-[var(--accent)]"
      >
        {track.artistName}
      </Link>
    </div>
  </Panel>
);
