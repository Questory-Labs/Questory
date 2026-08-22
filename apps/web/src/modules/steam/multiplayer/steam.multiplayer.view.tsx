"use client";

import { FamilyGameSidebar } from "@/components/FamilyGameSidebar";
import { PageHeader } from "@questorylabs/ui";
import { PlanFilters } from "./components/PlanFilters";
import { PlanResults } from "./components/PlanResults";
import type { MultiplayerViewProps } from "./steam.multiplayer.types";

export const MultiplayerView = (props: Record<string, unknown>) => {
  const {
    friends,
    plan,
    partyFriends,
    pageGames,
    page,
    setPage,
    totalPages,
    selectedAppId,
    setSelectedAppId,
    filters,
  } = props as MultiplayerViewProps;

  return (
    <>
      <div className="flex flex-col lg:h-[calc(100dvh-7.5rem)] lg:overflow-hidden">
        <PageHeader
          title="Multiplayer Planner"
          description="Find multiplayer games for your group — strict library match, filters, or trending suggestions"
          className="shrink-0"
        />

        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[320px_1fr]">
          <div className="min-h-0 min-w-0 overflow-y-auto lg:overscroll-y-contain">
            <PlanFilters friends={friends} filters={filters} />
          </div>

          <div className="min-h-0 min-w-0 overflow-y-auto lg:overscroll-y-contain">
            <PlanResults
              plan={plan}
              pageGames={pageGames}
              page={page}
              setPage={setPage}
              totalPages={totalPages}
              setSelectedAppId={setSelectedAppId}
            />
          </div>
        </div>
      </div>

      <FamilyGameSidebar
        appId={selectedAppId}
        onClose={() => setSelectedAppId(null)}
        variant="friends"
        partyFriends={partyFriends}
      />
    </>
  );
};
