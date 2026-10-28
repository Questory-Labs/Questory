import type { LibraryFacets, LibraryStatusFilter } from "@questorylabs/shared";
import { LIBRARY_STATUS_FILTERS } from "../steam.library.constants";

export const LibraryStatusChips = ({
  value,
  facets,
  onChange,
}: {
  value: LibraryStatusFilter | "all";
  facets: LibraryFacets | undefined;
  onChange: (value: LibraryStatusFilter | "all") => void;
}) => (
  <>
    {LIBRARY_STATUS_FILTERS.map((f) => {
      const on = f.value === value;
      const count = facets ? facets[f.value] : null;
      if (f.value === "dropped" && !on && !count) return null;
      return (
        <button
          key={f.value}
          type="button"
          aria-pressed={on}
          onClick={() => onChange(f.value)}
          className={`inline-flex min-h-11 items-baseline gap-[7px] rounded-full border px-4 text-[13px] transition-colors duration-300 hover:border-white/20 ${
            on
              ? "border-white/[0.16] bg-white/10 text-[var(--ink)]"
              : "border-white/[0.06] bg-black/20 text-[var(--faint)]"
          }`}
        >
          {count != null ? (
            <span
              className={`text-[17px] font-light ${on ? "text-white" : "text-[var(--muted)]"}`}
            >
              {count}
            </span>
          ) : null}
          {f.label}
        </button>
      );
    })}
  </>
);
