"use client";

import { useState } from "react";

const EXAMPLES = [
  'game:"counter strike"',
  "friend:gaben",
  "artist:radiohead",
  "movie:godfather within:<7d",
  "read:berserk",
  "genre:rpg hours:<10 deck:true",
] as const;

export function SearchTips() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-[var(--line)] bg-[var(--bg-1)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-[var(--muted)] transition hover:text-[var(--ink)]"
      >
        <span>Search tips</span>
        <span className="font-mono text-xs">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="border-t border-[var(--line)] px-4 py-3 text-sm text-[var(--muted)]">
          <p className="mb-3">
            Use fielded search: scope what you want with{" "}
            <code className="text-[var(--ink)]">type:value</code> tokens. Press{" "}
            <kbd className="border border-[var(--line)] px-1 font-mono text-xs">
              Ctrl+K
            </kbd>{" "}
            for quick search anywhere.
          </p>
          <ul className="space-y-1 font-mono text-xs text-[var(--ink)]">
            {EXAMPLES.map((ex) => (
              <li key={ex}>{ex}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
