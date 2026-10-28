"use client";

import { BrandMark } from "@/components/BrandMark";
import { useEffect, useState, type ReactNode } from "react";

export function AuthSplitLayout({
  aside,
  brand,
  children,
}: {
  aside: ReactNode;
  brand?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="box-border flex min-h-screen flex-wrap gap-3 bg-[radial-gradient(1200px_700px_at_30%_-10%,rgba(255,255,255,0.05),transparent_60%)] bg-[var(--bg-0)] p-3 text-[15px] leading-normal text-[var(--ink)]">
      <aside className="panel q-in relative flex min-w-0 flex-[1.15_1_520px] flex-col justify-between gap-6 overflow-hidden p-[clamp(24px,4vw,44px)]">
        {brand ?? <BrandMark href="/" size="sm" wordmarkClassName="text-lg" />}
        {aside}
      </aside>
      <main className="grid min-w-0 flex-[1_1_420px] place-items-center p-[clamp(16px,4vw,48px)]">
        {children}
      </main>
    </div>
  );
}

export function useInstanceHost() {
  const [host, setHost] = useState<string | null>(null);
  useEffect(() => {
    setHost(window.location.host || null);
  }, []);
  return host;
}

export function AuthStatusLine({
  tone = "ok",
  children,
}: {
  tone?: "ok" | "warn" | "muted";
  children: ReactNode;
}) {
  const dot =
    tone === "ok"
      ? "text-[var(--ok)]"
      : tone === "warn"
        ? "text-[var(--warn)]"
        : "text-[var(--faint)]";
  return (
    <p className="relative m-0 flex items-center gap-2 font-mono text-[11px] text-[var(--faint)]">
      <span aria-hidden className={`dot q-live h-[5px] w-[5px] ${dot}`} />
      {children}
    </p>
  );
}

export function AuthHeading({
  eyebrow,
  title,
  accent,
  sub,
  id,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  sub?: ReactNode;
  id?: string;
}) {
  return (
    <div>
      <p className="label-mono q-in m-0 text-[11px] [--i:1]">{eyebrow}</p>
      <h1
        id={id}
        className="q-in mt-2.5 text-[40px] font-light leading-[1.05] tracking-[-0.045em] [--i:2]"
      >
        {title} <span className="font-serif text-[#a1a1a6]">{accent}</span>
      </h1>
      {sub ? (
        <p className="q-in mt-2 mb-7 text-[var(--muted)] [--i:3]">{sub}</p>
      ) : null}
    </div>
  );
}

export const authFieldClass =
  "field mt-0 min-h-12 px-4 text-[15px] font-light tracking-normal";

export function AuthField({
  label,
  invalid,
  ...input
}: {
  label: string;
  invalid?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-[7px]">
      <span className="label-mono text-[var(--muted)]">{label}</span>
      <input
        {...input}
        aria-invalid={invalid || undefined}
        className={`${authFieldClass} ${
          invalid ? "border-[var(--danger)]/60 bg-[var(--danger)]/[0.04]" : ""
        }`}
      />
    </label>
  );
}

export function AuthAlert({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  return (
    <p
      id={id}
      role="alert"
      className="m-0 flex gap-2.5 rounded-[var(--radius)] border border-[var(--danger)]/20 bg-[var(--danger)]/[0.07] px-3.5 py-3 text-sm text-[#ffb0b0]"
    >
      <span aria-hidden className="dot mt-2 h-[5px] w-[5px] text-[var(--danger)]" />
      <span>{children}</span>
    </p>
  );
}
