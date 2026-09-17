"use client";

export const CostFilterGroup = ({
  value,
  onChange,
  options,
  ariaLabel,
  variant = "tabs",
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly { id: string; label: string }[];
  ariaLabel: string;
  variant?: "tabs" | "chips";
}) => (
  <div
    className={
      variant === "tabs"
        ? "flex flex-wrap gap-1"
        : "flex flex-wrap gap-2"
    }
    role="tablist"
    aria-label={ariaLabel}
  >
    {options.map((opt) => {
      const active = opt.id === value;
      return (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onChange(opt.id)}
          className={
            variant === "tabs"
              ? `px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] ${
                  active
                    ? "text-[var(--ink)] underline decoration-[var(--accent)] underline-offset-8"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`
              : `rounded-md border px-3 py-1.5 text-sm transition ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--ink)]"
                    : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
                }`
          }
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);
