"use client";

import type { CSSProperties } from "react";
import type { FamilyInsights, FamilyMemberSummary } from "@questorylabs/shared";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import {
  EmptyState,
  ResourceStatus,
  SkeletonListRows,
  SkeletonStatGrid,
} from "@questorylabs/ui";
import { FamilyMembersTable } from "./FamilyMembersTable";

type Stat = {
  label: string;
  value: string | number;
  hint: string;
  dot: string;
  tone?: string;
};

export const FamilyInsightsSection = ({
  insights,
  members,
  money,
}: {
  insights: UseResourceResult<FamilyInsights>;
  members: FamilyMemberSummary[];
  money: (n: number | null | undefined) => string;
}) => {
  const d = insights.value;
  const stats: Stat[] = [
    {
      label: "Unique games",
      value: d ? d.totalUniqueGames.toLocaleString() : "—",
      hint: "Distinct titles across all libraries",
      dot: "bg-[var(--ink)]",
    },
    {
      label: "Library value",
      value: d ? money(d.familyValue) : "—",
      hint: "Unique titles across family sharing — recorded prices when set, otherwise store prices",
      dot: "bg-[var(--warm)]",
    },
    {
      label: "Bought twice",
      value: d?.overlapCount ?? "—",
      hint: "Games owned by 2+ members (duplicate licenses)",
      dot: "bg-[var(--warn)]",
      tone: "text-[var(--warn)]",
    },
    {
      label: "Members",
      value: d?.memberCount ?? "—",
      hint: "People in this family group",
      dot: "bg-[var(--accent)]",
    },
  ];

  return (
    <ResourceStatus
      failed={insights.failed}
      empty={insights.empty}
      loading={
        <>
          <SkeletonStatGrid count={4} />
          <SkeletonListRows count={4} className="mt-4" />
        </>
      }
      error={
        <EmptyState
          title={
            <span className="text-[var(--danger)]">
              Could not load family insights.
            </span>
          }
        />
      }
    >
      <>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
          {stats.map((s, i) => (
            <div
              key={s.label}
              title={s.hint}
              className="panel q-lift q-in px-5 py-[18px]"
              style={{ "--i": i + 1 } as CSSProperties}
            >
              <p className="flex items-center gap-[7px] text-[13px] text-[var(--muted)]">
                <span aria-hidden="true" className={`h-[5px] w-[5px] rounded-full ${s.dot}`} />
                {s.label}
              </p>
              <p className={`num-light mt-3 text-[40px] leading-none ${s.tone ?? "text-[var(--ink)]"}`}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        <section
          aria-labelledby="family-members-heading"
          className="panel q-in px-2.5 pt-[18px] pb-2"
          style={{ "--i": 5 } as CSSProperties}
        >
          <div className="mx-2.5 mb-2 flex flex-wrap items-center justify-between gap-3">
            <h2 id="family-members-heading" className="text-[17px] font-normal">
              Members
            </h2>
            <p className="flex gap-3.5 font-mono text-[10px] text-[var(--muted)]">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="h-[3px] w-2.5 bg-[var(--ink)]" />
                Shared
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="h-[3px] w-2.5 bg-[var(--accent)]" />
                Unique
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="h-[3px] w-2.5 bg-white/[0.18]" />
                Other
              </span>
            </p>
          </div>
          {!members.length ? (
            <EmptyState title="No members yet. Import friends or add a SteamID64 above." />
          ) : (
            <div className="overflow-x-auto">
              <FamilyMembersTable
                members={d?.members || []}
                suggestedPurchaser={d?.suggestedPurchaser ?? null}
                money={money}
              />
            </div>
          )}
        </section>
      </>
    </ResourceStatus>
  );
};
