"use client";

import type { CSSProperties } from "react";
import type { StoreAccountStatus } from "@questorylabs/shared";
import { StoreBadge } from "@/components/StoreBadge";
import { STORE_COPY } from "../steam.settings-stores.constants";

export const StoreComingLaterCard = ({
  status,
  index,
}: {
  status: StoreAccountStatus;
  index: number;
}) => {
  const copy = STORE_COPY[status.store];
  const comingLater = status.status === "coming_later" || status.syncEnabled === false;
  return (
    <section
      aria-labelledby={`stores-${status.store}`}
      className={`q-lift q-in flex flex-wrap items-center gap-4 rounded-[24px] border px-6 py-5 ${
        comingLater ? "border-dashed border-white/[0.12]" : "panel"
      }`}
      style={{ "--i": index } as CSSProperties}
    >
      <span
        aria-hidden="true"
        className="grid h-[52px] w-[52px] place-items-center rounded-full border border-white/10 text-xl text-[var(--muted)]"
      >
        {copy.title[0]}
      </span>
      <div className="min-w-[200px] flex-1">
        <h2 id={`stores-${status.store}`} className="text-lg font-normal">
          {copy.title}
        </h2>
        <p className="mt-0.5 text-sm text-[var(--muted)]">{copy.blurb}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StoreBadge store={status.store} compact />
          {comingLater ? (
            <span className="text-xs text-[var(--faint)]">Manual import planned</span>
          ) : null}
        </div>
      </div>
      <span
        className={`rounded-full border px-3 py-1 font-mono text-[10px] tracking-[0.06em] uppercase ${
          comingLater
            ? "border-white/10 text-[#a1a1a6]"
            : "border-[rgba(143,214,196,0.3)] text-[var(--ok)]"
        }`}
      >
        {comingLater ? "Coming later" : "Connected"}
      </span>
    </section>
  );
};
