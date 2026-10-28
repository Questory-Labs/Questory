"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

const MENU_WIDTH = 270;

export type AdminMenuItem = {
  key: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
  separatorBefore?: boolean;
};

export const AdminMenu = ({
  trigger,
  triggerLabel,
  title,
  items,
  triggerClassName,
}: {
  trigger: ReactNode;
  triggerLabel?: string;
  title?: string;
  items: AdminMenuItem[];
  triggerClassName: string;
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onMove = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    setPos(
      rect
        ? { top: rect.bottom + 6, left: Math.max(8, rect.right - MENU_WIDTH) }
        : null,
    );
    setOpen(true);
  };

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        ref={triggerRef}
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={triggerClassName}
        onClick={toggle}
      >
        {trigger}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          style={pos ? { top: pos.top, left: pos.left } : undefined}
          className="q-pop fixed z-50 w-[270px] rounded-[20px] border border-white/10 bg-[rgba(22,22,24,0.92)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_48px_-12px_rgba(0,0,0,0.8)] backdrop-blur-[18px]"
        >
          {title ? <p className="label-mono mx-3 my-2">{title}</p> : null}
          {items.map((item) => (
            <div key={item.key}>
              {item.separatorBefore ? (
                <hr className="mx-2 my-1 border-0 border-t border-white/[0.08]" />
              ) : null}
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={`block min-h-10 w-full rounded-[14px] px-3 text-left text-sm font-light transition-[background,padding] duration-300 hover:bg-white/[0.06] hover:pl-4 disabled:cursor-not-allowed disabled:opacity-50 ${
                  item.danger ? "text-[#ff9a9a]" : "text-[var(--ink)]"
                }`}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.label}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};
