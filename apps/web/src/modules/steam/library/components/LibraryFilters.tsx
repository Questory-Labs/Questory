"use client";

import { Panel } from "@questorylabs/ui";

export const LibraryFilters = ({
  genre,
  unplayed,
  multiplayer,
  deck,
  onGenreChange,
  onUnplayedChange,
  onMultiplayerChange,
  onDeckChange,
}: {
  genre: string;
  unplayed: boolean;
  multiplayer: boolean;
  deck: boolean;
  onGenreChange: (value: string) => void;
  onUnplayedChange: (value: boolean) => void;
  onMultiplayerChange: (value: boolean) => void;
  onDeckChange: (value: boolean) => void;
}) => (
  <Panel variant="outline" className="flex flex-wrap items-center gap-x-5 gap-y-3 p-3">
    <label className="flex items-center gap-2.5 text-sm">
      <span className="text-[var(--muted)]">Genre</span>
      <input
        value={genre}
        onChange={(e) => onGenreChange(e.target.value)}
        placeholder="Any"
        className="field !mt-0 !w-[220px] max-w-full"
      />
    </label>
    <label className="field-check">
      <input
        type="checkbox"
        checked={unplayed}
        onChange={(e) => onUnplayedChange(e.target.checked)}
      />
      Unplayed
    </label>
    <label className="field-check">
      <input
        type="checkbox"
        checked={multiplayer}
        onChange={(e) => onMultiplayerChange(e.target.checked)}
      />
      Multiplayer
    </label>
    <label className="field-check">
      <input
        type="checkbox"
        checked={deck}
        onChange={(e) => onDeckChange(e.target.checked)}
      />
      Deck ready
    </label>
  </Panel>
);
