"use client";

import Link from "next/link";
import { MusicCover } from "@/components/music/MusicCover";
import { MusicHomeView } from "@/components/music/MusicHomeView";
import { OverflowMarquee, Panel } from "@/components/ui";
import { useMusicPlayingNow } from "@/hooks/useMusicPlayingNow";

function NowPlayingPanel() {
  const playing = useMusicPlayingNow();

  if (!playing.data?.track) return null;

  return (
    <Panel wrapperClassName="mb-8" className="flex items-center gap-4 p-4">
      <MusicCover src={playing.data.track.imageUrl} alt="" size="md" />
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
          Now playing
        </p>
        <OverflowMarquee className="mt-1 text-[var(--ink)]">
          <Link
            href={`/music/tracks/${playing.data.track.id}`}
            className="hover:text-[var(--accent)]"
          >
            {playing.data.track.title}
          </Link>
        </OverflowMarquee>
        <Link
          href={`/music/artists/${playing.data.track.artistId}`}
          className="text-sm text-[var(--muted)] hover:text-[var(--accent)]"
        >
          {playing.data.track.artistName}
        </Link>
      </div>
    </Panel>
  );
}

export default function MusicHomePage() {
  return <MusicHomeView afterHeader={<NowPlayingPanel />} />;
}
