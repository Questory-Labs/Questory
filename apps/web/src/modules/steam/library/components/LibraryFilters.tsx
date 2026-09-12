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
  <Panel variant="outline" className="mb-6 flex flex-wrap items-end gap-4 p-3">
    <label className="min-w-[10rem] text-sm">
      <span className="text-[var(--muted)]">Genre</span>
      <input
        value={genre}
        onChange={(e) => onGenreChange(e.target.value)}
        placeholder="Any"
        className="field"
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
