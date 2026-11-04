import Link from "next/link";
import type { Collection } from "@questorylabs/shared";
import { LIBRARY_SHELF_LIMIT } from "../steam.library.constants";

export const LibraryShelves = ({ collections }: { collections: Collection[] }) => {
  const shelves = collections
    .filter((c) => c.type === "auto" && c.gameCount > 0)
    .sort((a, b) => b.gameCount - a.gameCount)
    .slice(0, LIBRARY_SHELF_LIMIT);
  if (!shelves.length) return null;
  return (
    <nav
      aria-label="Smart shelves"
      className="q-in flex gap-2 overflow-x-auto pb-0.5"
      style={{ ["--i" as string]: 2 }}
    >
      {shelves.map((s) => (
        <Link
          key={s.id}
          href={`/collections/${s.id}`}
          className="flex min-h-10 flex-none items-center gap-2.5 rounded-[14px] border border-white/[0.06] bg-white/[0.03] pl-2.5 pr-3.5 text-[13px] text-[var(--muted)] transition-colors hover:border-white/20"
        >
          <span aria-hidden="true" className="dot-matrix q-twinkle h-[18px] w-[18px] rounded-[5px] opacity-80" />
          {s.name}
          <span className="font-mono text-[10px] text-[var(--faint)]">{s.gameCount}</span>
        </Link>
      ))}
    </nav>
  );
};
