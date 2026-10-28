"use client";

import type { MultiplayerPlanSort } from "@questorylabs/shared";
import { SegmentedControl } from "@/components/SegmentedControl";
import {
  GENRES,
  MODE_OPTIONS,
  PLAYER_MAX,
  PLAYER_MIN,
  SORT_OPTIONS,
  YEAR_MAX,
  YEAR_MIN,
} from "../steam.multiplayer.constants";
import type { MultiplayerViewProps } from "../steam.multiplayer.types";
import { DualRangeFilter } from "./DualRangeFilter";
import { InfoTip } from "./InfoTip";
import { PartyPicker } from "./PartyPicker";
import { ToggleSwitch } from "./ToggleSwitch";

const pillSelect =
  "flex min-h-10 items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/25 px-3.5 text-[13px] text-[var(--muted)]";

export const PlanFilters = ({
  friends,
  filters,
}: Pick<MultiplayerViewProps, "friends" | "filters">) => (
  <section
    aria-label="Who's playing"
    className="panel q-in flex flex-col gap-[18px] p-5 [--i:1]"
  >
    <PartyPicker friends={friends} filters={filters} />

    <div className="flex flex-wrap items-center gap-2">
      <span className="label-mono w-16">Mode</span>
      <div className="max-w-full overflow-x-auto">
        <SegmentedControl
          label="Mode"
          value={filters.mode}
          onChange={filters.setMode}
          options={MODE_OPTIONS}
        />
      </div>
    </div>

    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_220px]">
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
      <label className={`${pillSelect} self-start`}>
        Genre
        <select
          value={filters.genre}
          onChange={(e) => filters.setGenre(e.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-normal text-[var(--ink)]"
        >
          <option value="">Any</option>
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </label>
    </div>

    <div className="flex flex-wrap items-center gap-x-[26px] gap-y-3 border-t border-white/[0.06] pt-3.5 text-sm text-[#a1a1a6]">
      <ToggleSwitch
        label="Strict library matching"
        checked={filters.strictLibraryMatching}
        onChange={filters.setStrictLibraryMatching}
        tip={
          <InfoTip text="Only games you and every selected friend own. Off: match other filters without requiring full group ownership." />
        }
      />
      <ToggleSwitch
        label="Include suggestions to buy"
        checked={filters.suggested}
        onChange={filters.setSuggested}
        tip={
          <InfoTip text="Include trending multiplayer titles even if someone (or no one) in the group owns them." />
        }
      />
      <label className={`${pillSelect} sm:ml-auto`}>
        Sort
        <select
          value={filters.sortBy}
          onChange={(e) =>
            filters.setSortBy(e.target.value as MultiplayerPlanSort)
          }
          className="border-0 bg-transparent text-[13px] font-normal text-[var(--ink)]"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  </section>
);
