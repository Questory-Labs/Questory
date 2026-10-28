"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { SETTINGS_TABS, type SettingsTabKey } from "./steam.settings-shared.constants";

export const SettingsHeader = ({
  active,
  title,
  description,
  actions,
}: {
  active: SettingsTabKey;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) => {
  const index = Math.max(
    0,
    SETTINGS_TABS.findIndex((t) => t.key === active),
  );
  return (
    <header className="q-in px-1 pt-2 pb-2.5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono text-[11px]">Settings</p>
          <h1 className="font-display mt-1.5 text-[clamp(34px,4vw,52px)] leading-none">
            {title}
          </h1>
          {description ? (
            <p className="mt-2.5 max-w-[560px] text-[var(--muted)]">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      <nav
        aria-label="Settings"
        className="relative mt-5 inline-grid max-w-full grid-cols-3 rounded-full border border-white/[0.07] bg-white/[0.04] p-1"
      >
        <span
          aria-hidden="true"
          className="q-slide absolute inset-y-1 left-1 w-[calc((100%-8px)/3)] rounded-full bg-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
          style={{ transform: `translateX(${index * 100}%)` }}
        />
        {SETTINGS_TABS.map((tab) => {
          const current = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={current ? "page" : undefined}
              className={`relative grid min-h-[38px] w-[118px] max-w-[30vw] place-items-center text-sm font-normal transition-colors duration-300 ${
                current ? "text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
};
