"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import type { DashboardStats } from "@questorylabs/shared";
import { CountUp, cn } from "@questorylabs/ui";

const needsYouHref = (needs: NonNullable<DashboardStats["needsYou"]>) =>
  needs.failedSyncs === 0 && needs.unmatchedSessions > 0
    ? "/sessions"
    : "/settings/connections";

const needsYouDetail = (needs: NonNullable<DashboardStats["needsYou"]>) =>
  [
    needs.failedSyncs ? `${needs.failedSyncs} failed sync${needs.failedSyncs === 1 ? "" : "s"}` : null,
    needs.unmatchedSessions
      ? `${needs.unmatchedSessions} unmatched session${needs.unmatchedSessions === 1 ? "" : "s"}`
      : null,
    needs.unreadNotifications
      ? `${needs.unreadNotifications} unread notification${needs.unreadNotifications === 1 ? "" : "s"}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

const tileClass = "panel q-lift q-in block px-5 py-[18px] no-underline";
const valueClass = "m-0 text-[46px] font-extralight leading-[0.9]";

export const SummaryTiles = ({
  syncedSources,
  needsYou,
}: {
  syncedSources?: number;
  needsYou?: DashboardStats["needsYou"];
}) => {
  if (syncedSources == null && !needsYou) return null;
  const detail = needsYou ? needsYouDetail(needsYou) : "";
  return (
    <div className="grid grid-cols-2 gap-3.5">
      {syncedSources != null ? (
        <section className={tileClass} style={{ "--i": 1 } as CSSProperties}>
          <span
            aria-hidden="true"
            className="grid size-[22px] place-items-center rounded-full bg-[var(--ok)] text-[#0b1a10]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5 10 17 19 7" />
            </svg>
          </span>
          <div className="mt-3.5 flex items-end justify-between gap-2">
            <h2 className="m-0 text-[15px] font-normal">Sources synced</h2>
            <p className={valueClass}>
              <CountUp value={syncedSources} />
            </p>
          </div>
        </section>
      ) : null}
      {needsYou ? (
        <Link
          href={needsYouHref(needsYou)}
          title={detail || undefined}
          className={tileClass}
          style={{ "--i": 2 } as CSSProperties}
        >
          <span
            aria-hidden="true"
            className={cn(
              "block size-0 border-x-[11px] border-b-[19px] border-x-transparent",
              needsYou.total > 0 ? "border-b-[var(--danger)]" : "border-b-[var(--dim)]",
            )}
          />
          <div className="mt-3.5 flex items-end justify-between gap-2">
            <h2 className="m-0 text-[15px] font-normal">Needs you</h2>
            <p className={valueClass}>
              <CountUp value={needsYou.total} />
            </p>
          </div>
          {detail ? <span className="sr-only">{detail}</span> : null}
        </Link>
      ) : null}
    </div>
  );
};
