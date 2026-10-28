"use client";

import Link from "next/link";
import type { MusicPlayingNow } from "@questorylabs/shared";
import { TickScrubber } from "@questorylabs/ui";
import { Panel } from "@/components/ui";
import { EqBars } from "../../components/EqBars";
import { Vinyl } from "../../components/Vinyl";
import { usePlaybackClock } from "../../hooks/usePlaybackClock";
import { formatClock, playingSourceLabel } from "../../music.utils";

export const NowPlayingHero = ({
  playing,
}: {
  playing: NonNullable<MusicPlayingNow>;
}) => {
  const { track } = playing;
  const clock = usePlaybackClock(playing.startedAt, track.durationMs);
  const source = playingSourceLabel(playing.source);

  return (
    <Panel size="lg" wrapperClassName="q-in [--i:1]" className="relative overflow-hidden p-0">
      <section
        aria-labelledby="music-now-playing"
        className="flex flex-wrap items-center gap-6 bg-[linear-gradient(150deg,rgba(220,214,216,0.18),rgba(255,255,255,0.02)_55%)] px-[26px] py-[22px]"
      >
        <Vinyl coverUrl={track.imageUrl} />
        <div className="min-w-0 flex-[1_1_320px]">
          <p
            id="music-now-playing"
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--music)]"
          >
            <span aria-hidden="true" className="q-live h-[5px] w-[5px] rounded-full bg-[var(--ok)]" />
            Now playing{source ? ` · via ${source}` : ""}
          </p>
          <h2 className="mt-2 truncate text-[clamp(34px,3.6vw,48px)] font-extralight leading-none tracking-[-0.04em]">
            <Link href={`/music/tracks/${track.id}`} className="hover:text-[var(--music)]">
              {track.title}
            </Link>
          </h2>
          <p className="mt-1.5 truncate text-base text-[var(--muted)]">
            <Link href={`/music/artists/${track.artistId}`} className="hover:text-[var(--ink)]">
              {track.artistName}
            </Link>
            {track.releaseTitle ? (
              <>
                {" · "}
                {track.releaseId ? (
                  <Link
                    href={`/music/albums/${track.releaseId}`}
                    className="font-serif text-lg hover:text-[var(--ink)]"
                  >
                    {track.releaseTitle}
                  </Link>
                ) : (
                  <span className="font-serif text-lg">{track.releaseTitle}</span>
                )}
              </>
            ) : null}
            {track.year ? ` · ${track.year}` : null}
          </p>
          {clock ? (
            <div className="mt-[18px] flex items-center gap-3">
              <span className="font-mono text-[11px] text-[var(--muted)]">
                {formatClock(clock.elapsedMs)}
              </span>
              <TickScrubber
                value={clock.ratio}
                label="Approximate playback position"
                className="h-4 flex-1"
              />
              <span className="font-mono text-[11px] text-[var(--faint)]">
                {formatClock(clock.durationMs)}
              </span>
            </div>
          ) : track.durationMs ? (
            <p className="mt-[18px] font-mono text-[11px] text-[var(--faint)]">
              {formatClock(track.durationMs)}
            </p>
          ) : null}
        </div>
        <EqBars className="h-[70px]" />
      </section>
    </Panel>
  );
};
