"use client";

import { useEffect, useId, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../cn";
import { Button } from "./Button";
import { HatchShadow } from "./HatchShadow";

export const dialogOverlayVariants = cva(
  "fixed inset-0 z-50 flex items-center justify-center p-4",
);

export const dialogContentVariants = cva("relative z-10 w-full", {
  variants: {
    size: {
      sm: "max-w-sm",
      md: "max-w-md",
      lg: "max-w-lg",
      xl: "max-w-xl",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export type DialogVariantProps = VariantProps<typeof dialogContentVariants>;
export type DialogSize = NonNullable<DialogVariantProps["size"]>;

export type DialogProps = DialogVariantProps & {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
};

export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
  size,
}: DialogProps) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={dialogOverlayVariants()}>
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[var(--bg-0)]/75 hatch-fill"
        onClick={onClose}
      />
      <HatchShadow
        size="md"
        className={cn(dialogContentVariants({ size }), className)}
        faceClassName="dialog-face"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="w-full"
        >
          <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
            <h2
              id={titleId}
              className="font-display text-lg font-bold tracking-tight"
            >
              {title}
            </h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="text-[var(--muted)]"
            >
              Esc
            </Button>
          </div>
          <div className="px-5 py-4">{children}</div>
        </div>
      </HatchShadow>
    </div>
  );
}
