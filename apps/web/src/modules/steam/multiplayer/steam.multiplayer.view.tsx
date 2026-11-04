"use client";

import { FamilyGameSidebar } from "@/components/FamilyGameSidebar";
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
    selectedAppId,
    setSelectedAppId,
    filters,
  } = props as MultiplayerViewProps;

  return (
    <>
      <div className="mx-auto flex max-w-[1180px] flex-col gap-4">
        <header className="q-in px-1 pt-2 pb-1">
          <p className="label-mono !text-[11px]">Multiplayer planner</p>
          <h1 className="mt-1.5 text-[clamp(34px,4vw,52px)] leading-none font-light tracking-[-0.035em]">
            What can everyone{" "}
            <span className="font-serif text-[#a1a1a6]">launch tonight?</span>
          </h1>
          <p className="mt-2.5 text-[var(--muted)]">
            Pick who&apos;s playing. We find what everyone can launch tonight.
          </p>
        </header>

        <PlanFilters friends={friends} filters={filters} />

        <PlanResults
          plan={plan}
          pageGames={pageGames}
          page={page}
          setPage={setPage}
          setSelectedAppId={setSelectedAppId}
          filters={filters}
        />
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
