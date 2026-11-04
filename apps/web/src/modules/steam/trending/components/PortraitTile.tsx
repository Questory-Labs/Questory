"use client";

import { TrendingTile } from "./TrendingTile";

export const PortraitTile = ({
  name,
  imageUrl,
  meta,
  href,
  rank,
  index,
  aspectClassName = "aspect-[2/3]",
}: {
  name: string;
  imageUrl: string | null;
  meta?: string;
  href?: string | null;
  rank: number;
  index: number;
  aspectClassName?: string;
}) => (
  <TrendingTile
    name={name}
    imageUrl={imageUrl}
    meta={meta}
    href={href}
    rank={rank}
    index={index}
    aspectClassName={aspectClassName}
  />
);
