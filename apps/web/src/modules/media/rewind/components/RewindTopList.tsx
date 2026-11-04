"use client";

import { useState, type CSSProperties } from "react";
import type { RewindCategory, RewindRankItem } from "../media.rewind.summary.types";
import { RewindPlaceholder } from "./RewindPlaceholder";

const RewindThumb = ({
  src,
  category,
  seed,
}: {
  src?: string | null;
  category: RewindCategory;
  seed: string;
}) => {
  const [settled, setSettled] = useState<{ src: string; status: "loaded" | "failed" } | null>(null);
  const status = src && settled?.src === src ? settled.status : "pending";
  const showImage = Boolean(src) && status !== "failed";
  return (
    <span className="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-[var(--bg-3)]">
      {status === "loaded" && showImage ? null : (
        <RewindPlaceholder category={category} seed={seed} />
      )}
      {showImage ? (
        <img
          src={src ?? undefined}
          alt=""
          onLoad={() => src && setSettled({ src, status: "loaded" })}
          onError={() => src && setSettled({ src, status: "failed" })}
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
    </span>
  );
};

export const RewindTopList = ({
  title,
  category,
  items,
}: {
  title: string;
  category: RewindCategory;
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
            <RewindThumb src={item.imageUrl} category={category} seed={item.id} />
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
