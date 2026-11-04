export const PillSelect = <T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) => (
  <select
    aria-label={label}
    value={value}
    onChange={(e) => onChange(e.target.value as T)}
    className="min-h-[38px] cursor-pointer rounded-full border border-white/[0.08] bg-black/25 px-3.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--line-strong)]"
  >
    {options.map((o) => (
      <option key={`${o.value}-${o.label}`} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);
