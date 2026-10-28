export const ShelfSearchField = ({
  label,
  value,
  placeholder,
  onChange,
  onSubmit,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
}) => (
  <form
    role="search"
    className="flex min-h-[46px] flex-[1_1_260px] items-center gap-2.5 rounded-full border border-white/[0.08] bg-black/25 px-4 text-[var(--muted)] focus-within:border-[var(--line-strong)]"
    onSubmit={(e) => {
      e.preventDefault();
      onSubmit?.();
    }}
  >
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
    <input
      type="search"
      aria-label={label}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="min-w-0 flex-1 border-0 bg-transparent text-[15px] font-light text-[var(--ink)] outline-none"
    />
  </form>
);
