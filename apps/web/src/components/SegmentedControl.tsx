const optionClassName =
  "relative z-[1] h-full min-w-0 px-3 font-mono text-[11px] uppercase leading-none tracking-[0.1em] transition-colors duration-300";

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
}) => {
  const index = Math.max(
    0,
    options.findIndex((opt) => opt.value === value),
  );
  return (
    <div
      className="header-control relative inline-grid items-stretch rounded-full border border-[var(--line)] bg-white/[0.03] p-[3px]"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      role="group"
      aria-label={label}
    >
      <span
        aria-hidden="true"
        className="q-slide absolute inset-y-[3px] left-[3px] rounded-full bg-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
        style={{
          width: `calc((100% - 6px) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`${optionClassName} ${
              active
                ? "text-[var(--ink)]"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
