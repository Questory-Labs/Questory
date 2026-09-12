"use client";

import { FamilyGameSidebar } from "@/components/FamilyGameSidebar";
import { formatMoney } from "@/lib/money";
import { FAMILY_MEMBER_LIMIT } from "@questorylabs/shared";
import { Button, PageHeader } from "@questorylabs/ui";
import { FamilyConflictsSection } from "./components/FamilyConflictsSection";
import { FamilyImportDialog } from "./components/FamilyImportDialog";
import { FamilyInsightsSection } from "./components/FamilyInsightsSection";
import { FamilyLibrarySection } from "./components/FamilyLibrarySection";
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

  return (
    <>
      <PageHeader
        size="sm"
        title="Family Dashboard"
        description="Browse shareable family games by member, with ownership and price stats"
      />

      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex min-w-0 flex-nowrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!familyAtCapacity && steamId.trim()) onAdd();
          }}
        >
          <input
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
            placeholder="Add member SteamID64"
            className="field mt-0 h-9 w-[260px] max-w-full shrink"
          />
          <Button
            type="submit"
            disabled={addBusy || familyAtCapacity || !steamId.trim()}
            className="h-9 shrink-0"
          >
            {addBusy ? "Adding…" : "Add member"}
          </Button>
        </form>
        <Button
          variant="secondary"
          onClick={onOpenImport}
          disabled={familyAtCapacity}
          className="h-9 shrink-0"
        >
          Import from friends
        </Button>
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">
        {familyAtCapacity
          ? `Family is full (${FAMILY_MEMBER_LIMIT} people, including you). Remove someone to add another.`
          : `${FAMILY_MEMBER_LIMIT} people max, including you. ${remainingSlots} slot${remainingSlots === 1 ? "" : "s"} left.`}
      </p>
      {addError && (
        <p className="mt-2 text-sm text-[var(--danger)]">{addError}</p>
      )}

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

      <FamilyConflictsSection
        conflicts={conflicts}
        conflictsPage={conflictsPage}
        setConflictsPage={setConflictsPage}
        setSelectedAppId={setSelectedAppId}
      />

      <FamilyGameSidebar
        appId={selectedAppId}
        onClose={() => setSelectedAppId(null)}
      />
    </>
  );
};
