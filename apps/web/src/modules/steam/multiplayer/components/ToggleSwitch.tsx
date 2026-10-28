"use client";

import type { ReactNode } from "react";

export const ToggleSwitch = ({
  checked,
  onChange,
  label,
  tip,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  tip?: ReactNode;
}) => (
  <span className="inline-flex items-center gap-1.5">
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-10 cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-sm font-light text-[#cfcfd3]"
    >
      <span
        aria-hidden="true"
        className={`relative h-[22px] w-[38px] rounded-full border border-white/[0.12] transition-colors duration-[400ms] motion-reduce:transition-none ${
          checked ? "bg-[rgba(95,211,138,0.35)]" : "bg-white/[0.06]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-[var(--ink)] shadow-[0_0_10px_rgba(255,255,255,0.4)] transition-transform duration-500 ease-[var(--ease-out)] motion-reduce:transition-none ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
      {label}
    </button>
    {tip}
  </span>
);
