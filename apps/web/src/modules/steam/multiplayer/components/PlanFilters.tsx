"use client";

import {
  EmptyState,
  Panel,
  ResourceStatus,
  SkeletonListRows,
} from "@questorylabs/ui";
import type { MultiplayerPlanSort } from "@questorylabs/shared";
import {
  GENRES,
  PLAYER_MAX,
  PLAYER_MIN,
  SORT_OPTIONS,
  YEAR_MAX,
  YEAR_MIN,
} from "../steam.multiplayer.constants";
import type { MultiplayerViewProps } from "../steam.multiplayer.types";
import { DualRangeFilter } from "./DualRangeFilter";
import { InfoTip } from "./InfoTip";

export const PlanFilters = ({
  friends,
  filters,
}: Pick<MultiplayerViewProps, "friends" | "filters">) => {
  const friendList = friends.value?.friends || [];
  const { filteredFriends } = filters;

  return (
    <Panel className="space-y-4 p-4">
      <label className="block text-sm text-[var(--muted)]">
        Sort by
        <select
          value={filters.sortBy}
          onChange={(e) =>
            filters.setSortBy(e.target.value as MultiplayerPlanSort)
          }
          className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 text-[var(--ink)]"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <DualRangeFilter
        label="Players"
        tip="Poster shows party/lobby MAX from IGDB (e.g. MAX:3 or MAX:2/4), not match-wide player caps. Unknown capacity stays in the list without a chip."
        display={`${filters.minPlayers}–${filters.maxPlayers}`}
        minBound={PLAYER_MIN}
        maxBound={PLAYER_MAX}
        minValue={filters.minPlayers}
        maxValue={filters.maxPlayers}
        onMinChange={(value) => filters.setMinPlayers(value)}
        onMaxChange={(value) => filters.setMaxPlayers(value)}
      />

      <DualRangeFilter
        label="Release year"
        display={`${filters.minYear}–${filters.maxYear}`}
        minBound={YEAR_MIN}
        maxBound={YEAR_MAX}
        minValue={filters.minYear}
        maxValue={filters.maxYear}
        onMinChange={(value) => filters.setMinYear(value)}
        onMaxChange={(value) => filters.setMaxYear(value)}
      />

      <label className="block text-sm text-[var(--muted)]">
        Mode
        <select
          value={filters.mode}
          onChange={(e) =>
            filters.setMode(e.target.value as typeof filters.mode)
          }
          className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 text-[var(--ink)]"
        >
          <option value="">Any</option>
          <option value="online_coop">Online Co-op</option>
          <option value="local_coop">Local Co-op</option>
          <option value="pvp">PvP</option>
          <option value="crossplay">Crossplay</option>
        </select>
      </label>

      <label className="block text-sm text-[var(--muted)]">
        Genre
        <select
          value={filters.genre}
          onChange={(e) => filters.setGenre(e.target.value)}
          className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 text-[var(--ink)]"
        >
          <option value="">Any</option>
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <input
          type="checkbox"
          checked={filters.strictLibraryMatching}
          onChange={(e) => filters.setStrictLibraryMatching(e.target.checked)}
          className="accent-[var(--accent)]"
        />
        <span className="inline-flex items-center gap-1.5">
          Strict library matching
          <InfoTip text="Only games you and every selected friend own. Off: match other filters without requiring full group ownership." />
        </span>
      </label>

      <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <input
          type="checkbox"
          checked={filters.suggested}
          onChange={(e) => filters.setSuggested(e.target.checked)}
          className="accent-[var(--accent)]"
        />
        <span className="inline-flex items-center gap-1.5">
          Suggested
          <InfoTip text="Include trending multiplayer titles even if someone (or no one) in the group owns them." />
        </span>
      </label>

      <div>
        <div className="mb-2 text-sm text-[var(--muted)]">Friends</div>
        <input
          value={filters.friendFilter}
          onChange={(e) => filters.setFriendFilter(e.target.value)}
          placeholder="Search friends…"
          className="mb-2 w-full rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 text-sm text-[var(--ink)]"
        />
        <div className="max-h-64 space-y-2 overflow-y-auto">
          <ResourceStatus
            failed={friends.failed}
            empty={friends.empty}
            loading={<SkeletonListRows count={4} />}
            error={
              <EmptyState
                title={
                  <span className="text-[var(--danger)]">
                    Could not load friends.
                  </span>
                }
              />
            }
          >
            <>
              {filteredFriends.map((f) => (
                <label
                  key={f.steamId}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={filters.selected.includes(f.steamId)}
                    onChange={() => filters.toggle(f.steamId)}
                    className="accent-[var(--accent)]"
                  />
                  {f.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.avatarUrl}
                      alt=""
                      className="h-7 w-7 shrink-0 rounded-full"
                    />
                  ) : (
                    <span className="h-7 w-7 shrink-0 rounded-full bg-[var(--bg-2)]" />
                  )}
                  <span className="min-w-0 flex-1 truncate">
                    {f.personaName}
                  </span>
                </label>
              ))}
              {!friendList.length && (
                <p className="text-xs text-[var(--faint)]">
                  Sync friends to intersect libraries.
                </p>
              )}
              {friendList.length > 0 && !filteredFriends.length && (
                <p className="text-xs text-[var(--faint)]">
                  No friends match “{filters.friendFilter.trim()}”.
                </p>
              )}
            </>
          </ResourceStatus>
        </div>
      </div>
    </Panel>
  );
};
