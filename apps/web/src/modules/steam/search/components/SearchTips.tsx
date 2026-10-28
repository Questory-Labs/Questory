"use client";

import { useState } from "react";
import { SEARCH_TIP_EXAMPLES } from "../steam.search.constants";

export const SearchTips = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="panel overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left text-sm text-muted transition-colors hover:text-ink"
      >
        <span>Search tips</span>
        <span className="font-mono text-xs">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="border-t border-white/[0.06] px-5 py-4 text-sm text-muted">
          <p className="mb-3">
            Use fielded search: scope what you want with{" "}
            <code className="rounded-full bg-white/[0.05] px-2 py-0.5 font-mono text-[11px] text-ink">
              type:value
            </code>{" "}
            tokens. Press{" "}
            <kbd className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-muted">
              Ctrl+K
            </kbd>{" "}
            for quick search anywhere.
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {SEARCH_TIP_EXAMPLES.map((ex) => (
              <li
                key={ex}
                className="rounded-full bg-white/[0.05] px-2.5 py-1 font-mono text-[11px] text-ink"
              >
                {ex}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};
