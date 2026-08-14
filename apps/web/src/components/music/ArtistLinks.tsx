"use client";

import Link from "next/link";

export type ArtistLinkItem = {
  id: string;
  name: string;
  userDisplayName?: string | null;
};

function artistLabel(artist: ArtistLinkItem): string {
  return artist.userDisplayName?.trim() || artist.name;
}

function LinkedNames({ artists }: { artists: ArtistLinkItem[] }) {
  return (
    <>
      {artists.map((a, i) => (
        <span key={a.id}>
          {i > 0 ? ", " : null}
          <Link
            href={`/music/artists/${a.id}`}
            className="hover:text-[var(--accent)]"
          >
            {artistLabel(a)}
          </Link>
        </span>
      ))}
    </>
  );
}

export function ArtistLinks({
  artists,
  fallbackArtistId,
  fallbackArtistName,
}: {
  artists?: ArtistLinkItem[];
  fallbackArtistId: string;
  fallbackArtistName: string;
}) {
  const list =
    artists && artists.length > 0
      ? artists
      : [{ id: fallbackArtistId, name: fallbackArtistName }];
  const joined = list.map(artistLabel).join(", ");
  const credit = fallbackArtistName.trim();
  const creditDiffers = Boolean(credit) && credit !== joined;

  if (creditDiffers) {
    return (
      <>
        <span>{credit}</span>
        {list.length > 0 ? (
          <>
            {" · "}
            <LinkedNames artists={list} />
          </>
        ) : null}
      </>
    );
  }

  return <LinkedNames artists={list} />;
}
