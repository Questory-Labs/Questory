"use client";

import { SEARCH_SCOPE_OPTIONS, type SearchScopeFilter } from "./search.constants";

export const SearchScopeTabs = ({
  scopes,
  value,
  onChange,
}: {
  scopes: readonly SearchScopeFilter[];
  value: SearchScopeFilter;
  onChange: (scope: SearchScopeFilter) => void;
}) => {
  const options = SEARCH_SCOPE_OPTIONS.filter((o) => scopes.includes(o.value));
  if (options.length < 3) return null;
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div
      role="group"
      aria-label="Scope"
      className="relative grid rounded-full border border-white/[0.06] bg-black/30 p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="q-slide absolute bottom-1 left-1 top-1 rounded-full bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
        style={{
          width: `calc((100% - 8px) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`relative inline-flex min-h-[34px] min-w-0 items-center justify-center gap-1.5 text-[13px] transition-colors duration-300 ${
              active ? "text-white" : "text-muted hover:text-ink"
            }`}
          >
            <span aria-hidden="true" className="size-1 rounded-full" style={{ background: o.color }} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
};
