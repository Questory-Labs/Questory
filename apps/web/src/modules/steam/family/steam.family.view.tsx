"use client";

import { FamilyGameSidebar } from "@/components/FamilyGameSidebar";
import { formatMoney } from "@/lib/money";
import { FamilyConflictsSection } from "./components/FamilyConflictsSection";
import { FamilyHeader } from "./components/FamilyHeader";
import { FamilyImportDialog } from "./components/FamilyImportDialog";
import { FamilyInsightsSection } from "./components/FamilyInsightsSection";
import { FamilyLibrarySection } from "./components/FamilyLibrarySection";
import {
  FamilyShareablePanel,
  FamilyWishlistGapsPanel,
} from "./components/FamilyWishlistPanels";
import type { FamilyViewProps } from "./steam.family.types";

export const FamilyView = (props: Record<string, unknown>) => {
  const {
    insights,
    library,
    conflicts,
    friends,
    members,
    steamId,
    setSteamId,
    addError,
    addBusy,
    onAdd,
    showImport,
    onOpenImport,
    onCloseImport,
    importable,
    selected,
    importFilter,
    setImportFilter,
    toggle,
    toggleAll,
    importBusy,
    onImportSelected,
    importError,
    activeMember,
    setActiveMember,
    gameSearch,
    setGameSearch,
    page,
    setPage,
    conflictsPage,
    setConflictsPage,
    selectedAppId,
    setSelectedAppId,
    remainingSlots,
    familyAtCapacity,
  } = props as FamilyViewProps;

  const currency = insights.value?.currency || "USD";
  const money = (n: number | null | undefined) => formatMoney(n, currency);
  const insightsReady = !insights.empty && !insights.failed;

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-4">
      <FamilyHeader
        memberCount={insights.value?.memberCount ?? members.length}
        steamId={steamId}
        setSteamId={setSteamId}
        addBusy={addBusy}
        onAdd={onAdd}
        onOpenImport={onOpenImport}
        familyAtCapacity={familyAtCapacity}
        remainingSlots={remainingSlots}
        addError={addError}
      />

      <FamilyImportDialog
        open={showImport}
        onClose={onCloseImport}
        friends={friends}
        importable={importable}
        selected={selected}
        importFilter={importFilter}
        setImportFilter={setImportFilter}
        toggle={toggle}
        toggleAll={toggleAll}
        importBusy={importBusy}
        onImportSelected={onImportSelected}
        importError={importError}
        remainingSlots={remainingSlots}
      />

      <FamilyInsightsSection
        insights={insights}
        members={members}
        money={money}
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3.5">
        {insightsReady ? (
          <FamilyShareablePanel
            insights={insights.value}
            setSelectedAppId={setSelectedAppId}
          />
        ) : null}
        <FamilyConflictsSection
          conflicts={conflicts}
          conflictsPage={conflictsPage}
          setConflictsPage={setConflictsPage}
          setSelectedAppId={setSelectedAppId}
        />
        {insightsReady ? (
          <FamilyWishlistGapsPanel
            insights={insights.value}
            money={money}
            setSelectedAppId={setSelectedAppId}
          />
        ) : null}
      </div>

      <FamilyLibrarySection
        insights={insights}
        library={library}
        members={members}
        activeMember={activeMember}
        setActiveMember={setActiveMember}
        gameSearch={gameSearch}
        setGameSearch={setGameSearch}
        page={page}
        setPage={setPage}
        money={money}
        setSelectedAppId={setSelectedAppId}
      />

      <FamilyGameSidebar
        appId={selectedAppId}
        onClose={() => setSelectedAppId(null)}
      />
    </div>
  );
};
