"use client";

import { FamilyGameSidebar } from "@/components/FamilyGameSidebar";
import { formatMoney } from "@/lib/money";
import { Button, PageHeader } from "@questorylabs/ui";
import { FamilyConflictsSection } from "./components/FamilyConflictsSection";
import { FamilyImportPanel } from "./components/FamilyImportPanel";
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
    onToggleImport,
    importable,
    selected,
    importFilter,
    setImportFilter,
    toggle,
    toggleAll,
    importBusy,
    onImportSelected,
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
  } = props as FamilyViewProps;

  const currency = insights.value?.currency || "USD";
  const money = (n: number | null | undefined) => formatMoney(n, currency);

  return (
    <>
      <PageHeader
        title="Family Dashboard"
        description="Browse shareable family games by member, with ownership and price stats"
      />

      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (steamId.trim()) onAdd();
          }}
        >
          <input
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
            placeholder="Add member SteamID64"
            className="h-9 min-w-[260px] rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-3 text-sm"
          />
          <Button
            type="submit"
            disabled={addBusy || !steamId.trim()}
            className="h-9"
          >
            {addBusy ? "Adding…" : "Add member"}
          </Button>
        </form>
        <Button
          variant="secondary"
          onClick={onToggleImport}
          className="h-9"
        >
          {showImport ? "Hide friends" : "Import from friends"}
        </Button>
      </div>
      {addError && (
        <p className="mt-2 text-sm text-[var(--danger)]">{addError}</p>
      )}

      {showImport ? (
        <FamilyImportPanel
          friends={friends}
          importable={importable}
          selected={selected}
          importFilter={importFilter}
          setImportFilter={setImportFilter}
          toggle={toggle}
          toggleAll={toggleAll}
          importBusy={importBusy}
          onImportSelected={onImportSelected}
        />
      ) : null}

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
