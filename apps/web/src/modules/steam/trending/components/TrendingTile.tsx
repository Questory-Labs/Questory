"use client";

import type { CSSProperties, ReactNode } from "react";

export const TrendingTile = ({
  name,
  imageUrl,
  rank,
  meta,
  aspectClassName = "aspect-[460/215]",
  badges,
  footer,
  index = 0,
  onClick,
  href,
}: {
  name: string;
  imageUrl: string | null;
  rank: number;
  meta?: ReactNode;
  aspectClassName?: string;
  badges?: ReactNode;
  footer?: ReactNode;
  index?: number;
  onClick?: () => void;
  href?: string | null;
}) => {
  const body = (
    <>
      <span
        className={`relative block overflow-hidden rounded-[18px] border border-line bg-bg-1 transition-[border-color,box-shadow] duration-500 group-hover:border-white/20 group-hover:shadow-[0_26px_50px_-24px_rgba(0,0,0,0.95)] ${aspectClassName}`}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-[transform,filter] duration-[1200ms] ease-[var(--ease-out)] group-hover:scale-[1.08] group-hover:brightness-125 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <span className="hatch-fill absolute inset-0 flex items-center justify-center text-xs text-faint">
            No art
          </span>
        )}
        {badges ? (
          <span className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">{badges}</span>
        ) : null}
        <span className="absolute bottom-1.5 left-3 text-[44px] font-extralight leading-none tracking-[-0.05em] text-white/90 [text-shadow:0_2px_20px_rgba(0,0,0,0.6)]">
          {String(rank).padStart(2, "0")}
        </span>
      </span>
      <span className="mt-2.5 block truncate text-sm font-normal text-ink">{name}</span>
      {meta ? <span className="block font-mono text-[10px] text-muted">{meta}</span> : null}
      {footer ? <span className="mt-1.5 block">{footer}</span> : null}
    </>
  );
  const cardClass =
    "group block w-full text-left no-underline transition-transform duration-700 ease-[var(--ease-out)] hover:-translate-y-1.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0";
  return (
    <li className="q-in" style={{ "--i": index + 2 } as CSSProperties}>
      {onClick ? (
        <button type="button" onClick={onClick} className={cardClass}>
          {body}
        </button>
      ) : href ? (
        <a href={href} target="_blank" rel="noreferrer" className={cardClass}>
          {body}
        </a>
      ) : (
        <div className={cardClass}>{body}</div>
      )}
    </li>
  );
};

export const TrendingBadge = ({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "owned" }) => (
  <span
    className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.06em] backdrop-blur-md ${
      tone === "owned"
        ? "border-games/40 bg-black/55 text-games"
        : "border-white/15 bg-black/55 text-white/85"
    }`}
  >
    {children}
  </span>
);
