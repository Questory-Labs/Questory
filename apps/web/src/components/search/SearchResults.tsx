"use client";

import Link from "next/link";
import type { SearchResult } from "@questorylabs/shared";
import {
  collectionSearchHref,
  friendSearchHref,
  gameSearchHref,
  musicAlbumHref,
  musicArtistHref,
  musicTrackHref,
  readTitleHref,
  watchTitleHref,
} from "./search-links";
import { normalizeSearchResult } from "./normalize-search-result";

type SearchResultsProps = {
  data: SearchResult | undefined;
  showMusic?: boolean;
  showWatch?: boolean;
  showRead?: boolean;
  compact?: boolean;
  onNavigate?: () => void;
};

function Thumb({
  src,
  alt,
  fallback,
}: {
  src?: string | null;
  alt: string;
  fallback: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="h-8 w-8 shrink-0 border border-[var(--line)] object-cover"
      />
    );
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--line)] bg-[var(--bg-2)] font-mono text-[10px] uppercase text-[var(--muted)]">
      {fallback}
    </span>
  );
}

function Section({
  title,
  children,
  compact,
}: {
  title: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  if (!children) return null;
  return (
    <section className={compact ? "py-1" : "space-y-2"}>
      <h2
        className={
          compact
            ? "px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]"
            : "text-sm uppercase tracking-[0.14em] text-[var(--muted)]"
        }
      >
        {title}
      </h2>
      <div className={compact ? "space-y-0" : "space-y-1"}>{children}</div>
    </section>
  );
}

function Row({
  href,
  title,
  meta,
  thumb,
  onNavigate,
  compact,
}: {
  href: string;
  title: string;
  meta?: string;
  thumb?: React.ReactNode;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={
        compact
          ? "flex items-center gap-3 px-2 py-2 text-sm text-[var(--ink)] transition hover:bg-[var(--bg-2)]"
          : "flex items-center gap-3 border border-transparent px-2 py-2 transition hover:border-[var(--line)] hover:bg-[var(--bg-2)]"
      }
    >
      {thumb}
      <span className="min-w-0 flex-1">
        <span className="block truncate">{title}</span>
        {meta ? (
          <span className="block truncate text-xs text-[var(--muted)]">{meta}</span>
        ) : null}
      </span>
    </Link>
  );
}

export function SearchResults({
  data,
  showMusic = true,
  showWatch = true,
  showRead = true,
  compact = false,
  onNavigate,
}: SearchResultsProps) {
  const normalized = normalizeSearchResult(data);
  if (!normalized) return null;

  const hasGames = normalized.games.length > 0;
  const hasFriends = normalized.friends.length > 0;
  const hasCollections = normalized.collections.length > 0;
  const hasDevelopers = normalized.developers.length > 0;
  const hasPublishers = normalized.publishers.length > 0;
  const hasMusic =
    showMusic &&
    (normalized.music.artists.length > 0 ||
      normalized.music.albums.length > 0 ||
      normalized.music.tracks.length > 0);
  const hasWatch =
    showWatch &&
    (normalized.watch.movies.length > 0 || normalized.watch.shows.length > 0);
  const hasRead = showRead && normalized.read.titles.length > 0;

  const empty =
    !hasGames &&
    !hasFriends &&
    !hasCollections &&
    !hasDevelopers &&
    !hasPublishers &&
    !hasMusic &&
    !hasWatch &&
    !hasRead;

  if (empty) return null;

  return (
    <div className={compact ? "" : "space-y-6"}>
      {hasGames ? (
        <Section title="Games" compact={compact}>
          {normalized.games.map((g) => (
            <Row
              key={`${g.source}-${g.appId}`}
              href={gameSearchHref(g)}
              title={g.name}
              meta={g.source}
              thumb={
                <Thumb src={g.headerImage} alt={g.name} fallback={g.name.slice(0, 1)} />
              }
              onNavigate={onNavigate}
              compact={compact}
            />
          ))}
        </Section>
      ) : null}

      {hasFriends ? (
        <Section title="Friends" compact={compact}>
          {normalized.friends.map((f) => (
            <Row
              key={f.steamId}
              href={friendSearchHref(f.steamId)}
              title={f.personaName}
              thumb={
                <Thumb
                  src={f.avatarUrl}
                  alt={f.personaName}
                  fallback={f.personaName.slice(0, 1)}
                />
              }
              onNavigate={onNavigate}
              compact={compact}
            />
          ))}
        </Section>
      ) : null}

      {hasMusic ? (
        <>
          {normalized.music.artists.length > 0 ? (
            <Section title="Artists" compact={compact}>
              {normalized.music.artists.map((a) => (
                <Row
                  key={a.id}
                  href={musicArtistHref(a.id)}
                  title={a.name}
                  onNavigate={onNavigate}
                  compact={compact}
                />
              ))}
            </Section>
          ) : null}
          {normalized.music.albums.length > 0 ? (
            <Section title="Albums" compact={compact}>
              {normalized.music.albums.map((a) => (
                <Row
                  key={a.id}
                  href={musicAlbumHref(a.id)}
                  title={a.name}
                  meta={a.artistName ?? undefined}
                  onNavigate={onNavigate}
                  compact={compact}
                />
              ))}
            </Section>
          ) : null}
          {normalized.music.tracks.length > 0 ? (
            <Section title="Tracks" compact={compact}>
              {normalized.music.tracks.map((t) => (
                <Row
                  key={t.id}
                  href={musicTrackHref(t.id)}
                  title={t.name}
                  meta={[t.artistName, t.albumName].filter(Boolean).join(" · ")}
                  onNavigate={onNavigate}
                  compact={compact}
                />
              ))}
            </Section>
          ) : null}
        </>
      ) : null}

      {showWatch && normalized.watch.movies.length > 0 ? (
        <Section title="Movies" compact={compact}>
          {normalized.watch.movies.map((m) => (
            <Row
              key={m.id}
              href={watchTitleHref(m.id)}
              title={m.name}
              meta={m.year ? String(m.year) : undefined}
              thumb={
                <Thumb src={m.posterUrl} alt={m.name} fallback={m.name.slice(0, 1)} />
              }
              onNavigate={onNavigate}
              compact={compact}
            />
          ))}
        </Section>
      ) : null}

      {showWatch && normalized.watch.shows.length > 0 ? (
        <Section title="Shows" compact={compact}>
          {normalized.watch.shows.map((s) => (
            <Row
              key={s.id}
              href={watchTitleHref(s.id)}
              title={s.name}
              meta={s.year ? String(s.year) : undefined}
              thumb={
                <Thumb src={s.posterUrl} alt={s.name} fallback={s.name.slice(0, 1)} />
              }
              onNavigate={onNavigate}
              compact={compact}
            />
          ))}
        </Section>
      ) : null}

      {hasRead ? (
        <Section title="Reads" compact={compact}>
          {normalized.read.titles.map((t) => (
            <Row
              key={t.id}
              href={readTitleHref(t.id)}
              title={t.name}
              meta={[t.format, t.listStatus].filter(Boolean).join(" · ")}
              thumb={
                <Thumb src={t.coverUrl} alt={t.name} fallback={t.name.slice(0, 1)} />
              }
              onNavigate={onNavigate}
              compact={compact}
            />
          ))}
        </Section>
      ) : null}

      {hasCollections ? (
        <Section title="Collections" compact={compact}>
          {normalized.collections.map((c) => (
            <Row
              key={c.id}
              href={collectionSearchHref(c.id)}
              title={c.name}
              meta={`${c.gameCount} games`}
              onNavigate={onNavigate}
              compact={compact}
            />
          ))}
        </Section>
      ) : null}

      {hasDevelopers ? (
        <Section title="Developers" compact={compact}>
          {normalized.developers.map((d) => (
            <div
              key={d}
              className="px-2 py-1.5 text-sm text-[var(--ink)]"
            >
              {d}
            </div>
          ))}
        </Section>
      ) : null}

      {hasPublishers ? (
        <Section title="Publishers" compact={compact}>
          {normalized.publishers.map((p) => (
            <div
              key={p}
              className="px-2 py-1.5 text-sm text-[var(--ink)]"
            >
              {p}
            </div>
          ))}
        </Section>
      ) : null}
    </div>
  );
}

export function isSearchEmpty(data: SearchResult | undefined): boolean {
  const normalized = normalizeSearchResult(data);
  if (!normalized) return true;
  return (
    normalized.games.length === 0 &&
    normalized.friends.length === 0 &&
    normalized.collections.length === 0 &&
    normalized.developers.length === 0 &&
    normalized.publishers.length === 0 &&
    normalized.music.artists.length === 0 &&
    normalized.music.albums.length === 0 &&
    normalized.music.tracks.length === 0 &&
    normalized.watch.movies.length === 0 &&
    normalized.watch.shows.length === 0 &&
    normalized.read.titles.length === 0
  );
}

export function searchResultItems(data: SearchResult | undefined) {
  const normalized = normalizeSearchResult(data);
  if (!normalized) return [];
  const items: Array<{ id: string; label: string; href: string; group: string }> = [];

  for (const g of normalized.games) {
    items.push({
      id: `game-${g.source}-${g.appId}`,
      label: g.name,
      href: gameSearchHref(g),
      group: "Games",
    });
  }
  for (const f of normalized.friends) {
    items.push({
      id: `friend-${f.steamId}`,
      label: f.personaName,
      href: friendSearchHref(f.steamId),
      group: "Friends",
    });
  }
  for (const a of normalized.music.artists) {
    items.push({
      id: `artist-${a.id}`,
      label: a.name,
      href: musicArtistHref(a.id),
      group: "Artists",
    });
  }
  for (const a of normalized.music.albums) {
    items.push({
      id: `album-${a.id}`,
      label: a.name,
      href: musicAlbumHref(a.id),
      group: "Albums",
    });
  }
  for (const t of normalized.music.tracks) {
    items.push({
      id: `track-${t.id}`,
      label: t.name,
      href: musicTrackHref(t.id),
      group: "Tracks",
    });
  }
  for (const m of normalized.watch.movies) {
    items.push({
      id: `movie-${m.id}`,
      label: m.name,
      href: watchTitleHref(m.id),
      group: "Movies",
    });
  }
  for (const s of normalized.watch.shows) {
    items.push({
      id: `show-${s.id}`,
      label: s.name,
      href: watchTitleHref(s.id),
      group: "Shows",
    });
  }
  for (const t of normalized.read.titles) {
    items.push({
      id: `read-${t.id}`,
      label: t.name,
      href: readTitleHref(t.id),
      group: "Reads",
    });
  }
  for (const c of normalized.collections) {
    items.push({
      id: `collection-${c.id}`,
      label: c.name,
      href: collectionSearchHref(c.id),
      group: "Collections",
    });
  }

  return items;
}
