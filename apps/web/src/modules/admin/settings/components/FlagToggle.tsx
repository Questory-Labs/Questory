"use client";

import type { FeatureFlagOrigin } from "@questorylabs/shared";

export const originCaption = (origin: FeatureFlagOrigin): string => {
  if (origin === "db") return "Saved in Admin";
  if (origin === "env") return "From environment";
  return "Default";
};

export const FlagToggle = ({
  label,
  hint,
  origin,
  enabled,
  busy,
  onToggle,
  dotClassName,
}: {
  label: string;
  hint: string;
  origin?: FeatureFlagOrigin;
  enabled: boolean;
  busy: boolean;
  onToggle: () => void;
  dotClassName?: string;
}) => (
  <div className="flex items-start justify-between gap-4 border-t border-white/[0.05] py-3 first:border-t-0">
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-sm text-[var(--ink)]">
        {dotClassName ? <span className={`dot h-1.5 w-1.5 ${dotClassName}`} aria-hidden /> : null}
        {label}
      </div>
      <p className="mt-1 text-sm font-light text-[var(--muted)]">{hint}</p>
      {origin ? (
        <p className="label-mono mt-1 text-[10px]">{originCaption(origin)}</p>
      ) : null}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      disabled={busy}
      onClick={onToggle}
      className="group mt-0.5 inline-flex min-h-10 shrink-0 cursor-pointer items-center border-0 bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span
        aria-hidden
        className={`relative h-[26px] w-[48px] rounded-full border transition-[background,border-color,box-shadow] duration-[450ms] motion-reduce:transition-none ${
          enabled
            ? "border-[rgba(95,211,138,0.5)] bg-[rgba(95,211,138,0.22)] shadow-[0_0_16px_rgba(95,211,138,0.25)]"
            : "border-white/[0.12] bg-black/35"
        }`}
      >
        <span
          className={`absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full transition-transform duration-500 ease-[var(--ease-out)] motion-reduce:transition-none ${
            enabled ? "translate-x-[22px] bg-[var(--ink)]" : "translate-x-0 bg-[var(--faint)]"
          }`}
        />
      </span>
    </button>
  </div>
);
