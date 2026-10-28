"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { NavCounts, StoreAccountStatus } from "@questorylabs/shared";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import { StoreBadge } from "@/components/StoreBadge";
import { formatRelativePlayed } from "@/lib/dates";
import { SyncNowButton } from "../../settings-shared/SyncNowButton";
import { STORE_COPY } from "../steam.settings-stores.constants";
import { maskSteamId } from "../steam.settings-stores.utils";

const Stat = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="rounded-[18px] border border-white/[0.05] bg-black/25 px-4 py-3.5">
    <dt className="label-mono text-[10px]">{label}</dt>
    <dd className="mt-1.5">{children}</dd>
  </div>
);

const Count = ({ value }: { value: number | undefined }) =>
  value == null ? (
    <span className="text-[17px] font-normal text-[var(--muted)]">—</span>
  ) : (
    <span className="font-display text-[34px] leading-none font-extralight tracking-[-0.03em]">
      {value.toLocaleString()}
      <span className="text-xs tracking-normal text-[var(--faint)]"> games</span>
    </span>
  );

export const StoresSteamHero = ({
  status,
  navCounts,
}: {
  status: StoreAccountStatus;
  navCounts: UseResourceResult<NavCounts>;
}) => {
  const masked = maskSteamId(status.externalUserId);
  const meta = status.connected
    ? ["Connected", status.displayName, masked ? `SteamID ${masked}` : null]
        .filter(Boolean)
        .join(" · ")
    : "Not linked";
  return (
    <section
      aria-labelledby="stores-steam"
      className="panel q-in relative overflow-hidden border-[rgba(143,214,196,0.2)] bg-[linear-gradient(160deg,rgba(143,214,196,0.09),rgba(255,255,255,0.012)_55%)] p-6"
      style={{ "--i": 1 } as CSSProperties}
    >
      <div
        aria-hidden="true"
        className="dot-matrix pointer-events-none absolute -top-10 -right-10 h-[200px] w-[260px] opacity-35 [mask-image:radial-gradient(closest-side,#000_20%,transparent)]"
      />
      <div className="relative flex flex-wrap items-center gap-4">
        <span
          aria-hidden="true"
          className="relative grid h-[52px] w-[52px] place-items-center rounded-full border border-[rgba(143,214,196,0.4)] bg-black/30 text-xl font-normal text-[var(--games)]"
        >
          S
          {status.connected ? (
            <span className="q-live absolute right-px bottom-px h-2.5 w-2.5 rounded-full border-2 border-[#121214] bg-[var(--ok)]" />
          ) : null}
        </span>
        <div className="min-w-[200px] flex-1">
          <h2 id="stores-steam" className="flex items-center gap-2 text-xl font-normal">
            {STORE_COPY.steam.title}
            <StoreBadge store="steam" compact />
          </h2>
          <p
            className={`mt-0.5 font-mono text-[11px] ${
              status.connected ? "text-[var(--games)]" : "text-[var(--muted)]"
            }`}
          >
            {meta}
          </p>
        </div>
        {status.connected ? (
          <SyncNowButton />
        ) : (
          <Link
            href="/settings/connections"
            className="inline-flex min-h-11 items-center rounded-full bg-[var(--ink)] px-[18px] text-sm font-medium text-[#0a0a0b]"
          >
            Link Steam
          </Link>
        )}
      </div>
      <p className="relative mt-3 text-sm text-[var(--muted)]">{STORE_COPY.steam.blurb}</p>
      {status.connected ? (
        <>
          <dl className="relative mt-5 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
            <Stat label="Library">
              <Count value={navCounts.value?.library} />
            </Stat>
            <Stat label="Last sync">
              <span className="mt-1 block text-[17px] font-normal">
                {formatRelativePlayed(status.lastSyncedAt)}
              </span>
            </Stat>
            <Stat label="Wishlist">
              <Count value={navCounts.value?.wishlist} />
            </Stat>
          </dl>
          <div className="relative mt-4 flex flex-wrap items-center gap-2">
            <span className="pill text-sm text-[var(--muted)]">Sync runs automatically</span>
          </div>
          <p className="relative mt-3 text-[13px] text-[var(--muted)]">
            Playtime and achievements need your Steam profile&apos;s game details set to public.
          </p>
        </>
      ) : null}
    </section>
  );
};
