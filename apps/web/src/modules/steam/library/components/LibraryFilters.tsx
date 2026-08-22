"use client";

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
  <div className="mb-6 flex flex-wrap gap-3 text-sm">
    <input
      value={genre}
      onChange={(e) => onGenreChange(e.target.value)}
      placeholder="Genre"
      className="rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-3 py-1.5"
    />
    <label className="flex items-center gap-2 text-[var(--muted)]">
      <input
        type="checkbox"
        checked={unplayed}
        onChange={(e) => onUnplayedChange(e.target.checked)}
      />
      Unplayed
    </label>
    <label className="flex items-center gap-2 text-[var(--muted)]">
      <input
        type="checkbox"
        checked={multiplayer}
        onChange={(e) => onMultiplayerChange(e.target.checked)}
      />
      Multiplayer
    </label>
    <label className="flex items-center gap-2 text-[var(--muted)]">
      <input
        type="checkbox"
        checked={deck}
        onChange={(e) => onDeckChange(e.target.checked)}
      />
      Deck ready
    </label>
  </div>
);
