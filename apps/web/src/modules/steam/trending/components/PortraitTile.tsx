"use client";

import { HatchShadow } from "@/components/HatchShadow";

export const PortraitTile = ({
  name,
  imageUrl,
  meta,
  href,
}: {
  name: string;
  imageUrl: string | null;
  meta?: string;
  href?: string | null;
}) => {
  const body = (
    <HatchShadow
      size="sm"
      faceClassName="group panel flex flex-col hover:border-[var(--line-strong)]"
    >
      <div className="relative overflow-hidden bg-[var(--bg-2)]">
        <div className="aspect-[2/3] w-full" aria-hidden />
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center hatch-fill text-xs text-[var(--faint)]">
            No art
          </div>
        )}
      </div>
      <div className="shrink-0 border-t border-[var(--line)] px-3 py-2.5">
        <div className="truncate text-sm font-medium text-[var(--ink)]">{name}</div>
        {meta ? (
          <div className="font-mono mt-1 text-[11px] text-[var(--muted)]">{meta}</div>
        ) : null}
      </div>
    </HatchShadow>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="block w-full">
        {body}
      </a>
    );
  }
  return body;
};
