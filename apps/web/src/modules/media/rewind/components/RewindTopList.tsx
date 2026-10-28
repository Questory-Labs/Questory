"use client";

import type { CSSProperties } from "react";
import type { RewindRankItem } from "../media.rewind.summary.types";

export const RewindTopList = ({
  title,
  items,
}: {
  title: string;
  items: RewindRankItem[];
}) => {
  if (!items?.length) return null;
  return (
    <section
      aria-label={title}
      className="panel q-in px-3.5 pb-2.5 pt-5"
      style={{ "--i": 10 } as CSSProperties}
    >
      <h2 className="mx-2 text-[17px] font-normal">{title}</h2>
      <ol className="mt-2.5 list-none p-0">
        {items.map((item, i) => (
          <li
            key={item.id}
            className="q-row flex min-h-[46px] items-center gap-3.5 rounded-[14px] px-2"
          >
            <span className="w-[22px] font-mono text-[10px] text-[var(--dim)]">
              {String(i + 1).padStart(2, "0")}
            </span>
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt=""
                className="size-8 shrink-0 rounded-lg bg-[var(--bg-3)] object-cover"
              />
            ) : null}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-normal">{item.name}</span>
              {item.subtitle ? (
                <span className="block truncate text-xs text-muted">{item.subtitle}</span>
              ) : null}
            </span>
            <span
              className={`num-light shrink-0 text-xl ${i === 0 ? "text-white" : "text-[#a1a1a6]"}`}
            >
              {item.value}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
};
