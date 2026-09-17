"use client";

import { StatCard } from "@/components/StatCard";
import type { GlanceTile } from "../steam.library-game.utils";

export const LibraryGameGlance = ({ tiles }: { tiles: GlanceTile[] }) => {
  if (!tiles.length) return null;
  return (
    <section className="mt-10" aria-label="Key stats">
      <h2 className="mb-3 font-display text-lg font-semibold">At a glance</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <StatCard
            key={tile.label}
            label={tile.label}
            value={tile.value}
            hint={tile.hint}
            href={tile.href}
          />
        ))}
      </div>
    </section>
  );
};
