import { cva } from "class-variance-authority";

export const dateFieldTriggerVariants = cva(
  "mt-1.5 flex h-9 w-full items-center justify-between gap-2 rounded border bg-[var(--bg-2)] px-2.5 text-left text-sm text-[var(--ink)] outline-none",
  {
    variants: {
      open: {
        true: "border-[var(--line-strong)]",
        false: "border-[var(--line)] hover:border-[var(--line-strong)]",
      },
    },
    defaultVariants: {
      open: false,
    },
  },
);

export const dateFieldNavButtonVariants = cva(
  "rounded px-1.5 py-0.5 text-[var(--muted)] hover:text-[var(--ink)] disabled:pointer-events-none disabled:opacity-40",
);

export const dateFieldSwitchVariants = cva(
  "flex items-center gap-1 rounded px-1.5 py-0.5 text-xs",
  {
    variants: {
      active: {
        true: "bg-[var(--bg-2)] text-[var(--ink)]",
        false: "text-[var(--ink)] hover:bg-[var(--bg-2)]",
      },
      tabular: {
        true: "tabular-nums",
        false: "",
      },
    },
    defaultVariants: {
      active: false,
      tabular: false,
    },
  },
);

export const dateFieldCellVariants = cva("h-8 rounded text-xs", {
  variants: {
    active: {
      true: "bg-[var(--accent)] text-[var(--bg-0)]",
      false: "text-[var(--ink)] hover:bg-[var(--bg-2)]",
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const dateFieldDayVariants = cva("h-7 rounded text-xs", {
  variants: {
    state: {
      selected: "bg-[var(--accent)] text-[var(--bg-0)]",
      today: "text-[var(--ink)] ring-1 ring-inset ring-[var(--line-strong)]",
      idle: "text-[var(--ink)] hover:bg-[var(--bg-2)]",
    },
  },
  defaultVariants: {
    state: "idle",
  },
});
