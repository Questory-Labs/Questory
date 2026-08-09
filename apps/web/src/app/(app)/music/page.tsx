"use client";

import Link from "next/link";
import { MusicCover } from "@/components/music/MusicCover";
import { MusicHomeView } from "@/components/music/MusicHomeView";
import { OverflowMarquee, Panel } from "@/components/ui";
import { useMusicPlayingNow } from "@/hooks/useMusicPlayingNow";

function NowPlayingPanel() {
  const playing = useMusicPlayingNow();

  if (!playing.value?.track) return null;

  return (
    <Panel wrapperClassName="mb-8" className="flex items-center gap-4 p-4">
      <MusicCover src={playing.value.track.imageUrl} alt="" size="md" />
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
          Now playing
        </p>
        <OverflowMarquee className="mt-1 text-[var(--ink)]">
          <Link
            href={`/music/tracks/${playing.value.track.id}`}
            className="hover:text-[var(--accent)]"
          >
            {playing.value.track.title}
          </Link>
        </OverflowMarquee>
        <Link
          href={`/music/artists/${playing.value.track.artistId}`}
          className="text-sm text-[var(--muted)] hover:text-[var(--accent)]"
        >
          {playing.value.track.artistName}
        </Link>
      </div>
    </Panel>
  );
}

export default function MusicHomePage() {
  return <MusicHomeView afterHeader={<NowPlayingPanel />} />;
}
