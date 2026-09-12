"use client";

import { StatCard } from "@/components/StatCard";
import type { FamilyInsights, FamilyMemberSummary } from "@questorylabs/shared";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import {
  EmptyState,
  ResourceStatus,
  SkeletonListRows,
  SkeletonStatGrid,
} from "@questorylabs/ui";
import { FamilyMembersTable } from "./FamilyMembersTable";

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

  return (
    <>
      <ResourceStatus
        failed={insights.failed}
        empty={insights.empty}
        loading={
          <>
            <SkeletonStatGrid count={4} className="mt-8" />
            <SkeletonListRows count={4} className="mt-6" />
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
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Members"
              value={d?.memberCount ?? "—"}
              hint="People in this family group"
            />
            <StatCard
              label="Unique games"
              value={d?.totalUniqueGames ?? "—"}
              hint="Distinct titles across all libraries"
            />
            <StatCard
              label="Overlaps"
              value={d?.overlapCount ?? "—"}
              hint="Games owned by 2+ members (duplicate licenses)"
            />
            <StatCard
              label="Library value"
              value={d ? money(d.familyValue) : "—"}
              hint="Unique titles across family sharing — recorded prices when set, otherwise store prices"
            />
          </div>

          <section className="panel-outline mt-6 overflow-x-auto">
            {!members.length ? (
              <EmptyState
                title="No members yet. Import friends or add a SteamID64 above."
              />
            ) : (
              <FamilyMembersTable
                members={d?.members || []}
                suggestedPurchaserSteamId={d?.suggestedPurchaser?.steamId}
                money={money}
              />
            )}
          </section>
        </>
      </ResourceStatus>
    </>
  );
};
