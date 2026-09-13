const optionClassName =
  "h-full px-2.5 font-mono text-[11px] uppercase leading-none tracking-[0.12em] transition-colors";

export const SegmentedControl = <T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
}) => (
  <div
    className="header-control inline-flex items-stretch gap-1 rounded border border-[var(--line)] p-0.5"
    role="group"
    aria-label={label}
  >
    {options.map((opt) => {
      const active = opt.value === value;
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`${optionClassName} ${
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
