"use client";

import Link from "next/link";
import { useEffect, useMemo, type ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";
import { DotCanvas } from "@/components/dots/DotCanvas";
import {
  createGlyphPainter,
  DOT_INK,
  DOT_TINTS,
  GLYPH_GRID,
} from "@/components/dots/dot-painters";
import { RotatingTagline } from "@/components/RotatingTagline";
import { Button } from "@/components/ui";

export type StatusPageTone = "mint" | "warm" | "danger" | "warn" | "ink";

export type StatusPageAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
};

export type StatusPageProps = {
  code: string;
  eyebrow: string;
  title: string;
  titleAccent?: string;
  /** Fixed copy; omit with `taglineContext` set for a random iconic quote. */
  description?: string;
  /** Show a random quote from this pool when no `description` is given. */
  taglineContext?: "notFound" | "serverError";
  /** Mono quest-log line shown under the panel. */
  logLine?: string;
  reference?: string;
  tone?: StatusPageTone;
  primary: StatusPageAction;
  secondary?: StatusPageAction;
  /** Full-page ambient layout (default) vs in-shell compact layout. */
  layout?: "full" | "embedded";
  children?: ReactNode;
};

const toneTint: Record<StatusPageTone, string> = {
  mint: DOT_TINTS.games,
  warm: DOT_TINTS.watch,
  danger: DOT_TINTS.danger,
  warn: DOT_TINTS.warn,
  ink: DOT_INK,
};

const toneDot: Record<StatusPageTone, string> = {
  mint: "text-[var(--accent)]",
  warm: "text-[var(--warm)]",
  danger: "text-[var(--danger)]",
  warn: "text-[var(--warn)]",
  ink: "text-[#a1a1a6]",
};

function StatusAction({
  action,
  fallbackVariant,
}: {
  action: StatusPageAction;
  fallbackVariant: "primary" | "secondary";
}) {
  const variant =
    (action.variant ?? fallbackVariant) === "primary" ? "primary" : "ghost";
  const size = "min-h-12 px-[22px] text-[15px]";

  if (action.onClick) {
    return (
      <Button
        type="button"
        variant={variant}
        className={size}
        onClick={action.onClick}
      >
        {action.label}
      </Button>
    );
  }

  if (!action.href) return null;

  return (
    <Link href={action.href} className={`btn btn-${variant} ${size}`}>
      {action.label}
    </Link>
  );
}

export function StatusReference({ id }: { id: string }) {
  return (
    <p className="q-in mt-[22px] mb-0 text-[13px] text-[var(--faint)] [--i:5]">
      Reference{" "}
      <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[#bdbdc2] select-all">
        {id}
      </span>{" "}
      · share this with the admin
    </p>
  );
}

function StatusContent({
  code,
  eyebrow,
  title,
  titleAccent,
  description,
  taglineContext,
  logLine,
  reference,
  tone = "ink",
  primary,
  secondary,
  children,
}: Omit<StatusPageProps, "layout">) {
  const paint = useMemo(
    () => createGlyphPainter(code, toneTint[tone]),
    [code, tone],
  );

  return (
    <div className="mx-auto w-full max-w-[560px] text-center">
      <DotCanvas
        paint={paint}
        width={GLYPH_GRID.w * GLYPH_GRID.step}
        height={GLYPH_GRID.h * GLYPH_GRID.step}
        label={code}
        staticTime={2}
        className="mx-auto w-full max-w-[520px]"
      />
      <p className="q-in mt-[18px] mb-0 inline-flex items-center gap-2 rounded-full border border-white/10 px-3.5 py-[5px] font-mono text-[11px] tracking-[0.06em] text-[#a1a1a6] [--i:1]">
        <span aria-hidden className={`dot h-[5px] w-[5px] ${toneDot[tone]}`} />
        <span>{code}</span>
        <span aria-hidden>·</span>
        <span>{eyebrow}</span>
      </p>
      <h1
        id="status-page-title"
        className="q-in mt-4 mb-0 text-[clamp(34px,4.4vw,52px)] font-light leading-[1.02] tracking-[-0.045em] text-[var(--ink)] [--i:2]"
      >
        {title}
        {titleAccent ? (
          <>
            {" "}
            <span className="font-serif tracking-[-0.02em] text-[#a1a1a6]">
              {titleAccent}
            </span>
          </>
        ) : null}
      </h1>
      <div className="q-in mx-auto mt-3 max-w-[440px] text-[#8d8d92] [--i:3]">
        {description ? (
          <p className="m-0">{description}</p>
        ) : taglineContext ? (
          <RotatingTagline context={taglineContext} rotate={false} />
        ) : null}
        {children}
      </div>

      <div className="q-in mt-7 flex flex-wrap justify-center gap-2.5 [--i:4]">
        <StatusAction action={primary} fallbackVariant="primary" />
        {secondary ? (
          <StatusAction action={secondary} fallbackVariant="secondary" />
        ) : null}
      </div>

      {reference ? <StatusReference id={reference} /> : null}

      {logLine ? (
        <p className="mx-auto mt-8 max-w-lg font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--dim)]">
          {logLine}
        </p>
      ) : null}
    </div>
  );
}

export function StatusPage({
  layout = "full",
  ...props
}: StatusPageProps) {
  useEffect(() => {
    if (layout !== "full") return;
    document.documentElement.classList.add("landing-active");
    return () => document.documentElement.classList.remove("landing-active");
  }, [layout]);

  if (layout === "embedded") {
    return (
      <section
        aria-labelledby="status-page-title"
        className="grid place-items-center px-4 pt-6 pb-16"
      >
        <StatusContent {...props} />
      </section>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-0)] text-[var(--ink)]">
      <header className="px-6 pt-6">
        <BrandMark href="/" size="sm" wordmarkClassName="text-lg" />
      </header>
      <main className="grid flex-1 place-items-center px-4 pt-6 pb-16">
        <StatusContent {...props} />
      </main>
    </div>
  );
}
