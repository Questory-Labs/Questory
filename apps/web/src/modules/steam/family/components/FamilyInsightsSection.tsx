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
import { memberLabel } from "../steam.family.utils";

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
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                    <th className="px-4 py-3 font-medium">Member</th>
                    <th className="px-3 py-3 font-medium tabular-nums">Games</th>
                    <th className="px-3 py-3 font-medium tabular-nums">Shared</th>
                    <th className="px-3 py-3 font-medium tabular-nums">Unique</th>
                    <th className="px-3 py-3 font-medium tabular-nums">Value</th>
                    <th className="px-3 py-3 font-medium tabular-nums">
                      Wishlist gaps
                    </th>
                    <th className="px-3 py-3 font-medium tabular-nums">Unplayed</th>
                    <th className="px-3 py-3 font-medium tabular-nums">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {(d?.members || []).map((m) => (
                    <tr
                      key={m.steamId}
                      className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--bg-2)]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {m.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.avatarUrl}
                              alt=""
                              className="h-7 w-7 rounded-full"
                            />
                          ) : (
                            <span className="h-7 w-7 rounded-full bg-[var(--bg-2)]" />
                          )}
                          <span className="truncate font-medium">
                            {memberLabel(m)}
                          </span>
                          {d?.suggestedPurchaser?.steamId === m.steamId && (
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--accent)]">
                              &bull;
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono tabular-nums">
                        {m.librarySize}
                      </td>
                      <td className="px-3 py-3 font-mono tabular-nums">
                        {m.sharedCount ?? "—"}
                      </td>
                      <td className="px-3 py-3 font-mono tabular-nums">
                        {m.uniqueCount ?? "—"}
                      </td>
                      <td className="px-3 py-3 font-mono tabular-nums">
                        {m.trackedSpend != null ? money(m.trackedSpend) : "—"}
                      </td>
                      <td className="px-3 py-3 font-mono tabular-nums">
                        {m.wishlistGaps ?? "—"}
                      </td>
                      <td className="px-3 py-3 font-mono tabular-nums">
                        {m.unusedCount ?? "—"}
                      </td>
                      <td className="px-3 py-3 font-mono tabular-nums">
                        {m.playtimeHours != null ? `${m.playtimeHours}h` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      </ResourceStatus>
    </>
  );
};
