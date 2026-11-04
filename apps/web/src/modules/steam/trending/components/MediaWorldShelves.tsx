"use client";

import { EmptyState } from "@questorylabs/ui";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { MediaTrendingShelf } from "@questorylabs/shared";
import { GameShelf } from "./GameShelf";
import { PortraitTile } from "./PortraitTile";

const shelfError = (title: string) => (
  <EmptyState title={<span className="text-danger">{title}</span>} />
);

const MediaShelf = ({
  title,
  description,
  resource,
  failTitle,
  emptyTitle,
  aspectClassName,
}: {
  title: string;
  description: string;
  resource: UseResourceResult<MediaTrendingShelf>;
  failTitle: string;
  emptyTitle: string;
  aspectClassName: string;
}) => (
  <GameShelf
    title={title}
    description={description}
    aspectClassName={aspectClassName}
    failed={resource.failed}
    empty={resource.empty}
    error={shelfError(failTitle)}
    emptyContent={
      resource.value && !resource.value.items?.length ? <EmptyState title={emptyTitle} /> : undefined
    }
    meta={
      resource.value
        ? `${resource.value.meta.windowLabel}${resource.value.meta.cached ? " · cached" : ""}`
        : undefined
    }
  >
    {(resource.value?.items ?? []).map((item, i) => (
      <PortraitTile
        key={item.id}
        name={item.name}
        imageUrl={item.imageUrl}
        meta={item.subtitle ?? undefined}
        href={item.href}
        rank={item.rank ?? i + 1}
        index={i}
        aspectClassName={aspectClassName}
      />
    ))}
  </GameShelf>
);

export const MediaWorldShelves = ({
  showMusic,
  showWatch,
  showRead,
  music,
  watch,
  read,
}: {
  showMusic: boolean;
  showWatch: boolean;
  showRead: boolean;
  music?: UseResourceResult<MediaTrendingShelf>;
  watch?: UseResourceResult<MediaTrendingShelf>;
  read?: UseResourceResult<MediaTrendingShelf>;
}) => (
  <>
    {showMusic && music ? (
      <MediaShelf
        title="ListenBrainz this week"
        description="Sitewide artists for the completed Monday–Sunday week"
        resource={music}
        failTitle="Could not load ListenBrainz sitewide charts."
        emptyTitle="ListenBrainz sitewide chart unavailable right now."
        aspectClassName="aspect-square"
      />
    ) : null}
    {showWatch && watch ? (
      <MediaShelf
        title="TMDB trending"
        description="Movies and TV over the last 7 days — TMDB half-life, not a calendar week"
        resource={watch}
        failTitle="Could not load TMDB trending."
        emptyTitle="TMDB trending unavailable right now."
        aspectClassName="aspect-[2/3]"
      />
    ) : null}
    {showRead && read ? (
      <MediaShelf
        title="AniList trending now"
        description="Public manga ranking right now — not last week’s chart"
        resource={read}
        failTitle="Could not load AniList trending."
        emptyTitle="AniList trending unavailable right now."
        aspectClassName="aspect-[2/3]"
      />
    ) : null}
  </>
);
