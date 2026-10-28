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
    className="inline-flex flex-wrap gap-0.5 rounded-full border border-white/[0.07] bg-white/[0.04] p-1"
    role="tablist"
    aria-label={ariaLabel}
    data-variant={variant}
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
          className={`min-h-9 rounded-full px-3.5 text-[13px] transition-colors duration-300 ${
            active
              ? "bg-white/10 text-[var(--ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
              : "text-[var(--muted)] hover:text-[var(--ink)]"
          }`}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);
