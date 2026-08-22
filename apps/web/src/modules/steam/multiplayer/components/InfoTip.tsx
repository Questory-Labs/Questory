"use client";

export const InfoTip = ({ text }: { text: string }) => (
  <span className="group/tip relative inline-flex">
    <button
      type="button"
      aria-label="More info"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[var(--line)] font-mono text-[10px] leading-none text-[var(--faint)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      i
    </button>
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-md border border-[var(--line)] bg-[var(--bg-1)] px-2.5 py-2 text-left text-[11px] leading-snug text-[var(--muted)] opacity-0 shadow-lg transition-opacity group-hover/tip:opacity-100 group-focus-within/tip:opacity-100"
    >
      {text}
    </span>
  </span>
);
