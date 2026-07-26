"use client";

export type WatchMediaFilter = "all" | "movie" | "show";

const OPTIONS: { value: WatchMediaFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "show", label: "TV" },
];

export function WatchMediaPicker({
  value,
  onChange,
}: {
  value: WatchMediaFilter;
  onChange: (type: WatchMediaFilter) => void;
}) {
  return (
    <div
      className="inline-flex flex-wrap gap-1 rounded border border-[var(--line)] p-1"
      role="group"
      aria-label="Media type"
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors ${
              active
                ? "bg-[var(--ink)] text-[var(--bg-0)]"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
