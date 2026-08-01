"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";
import { HatchShadow } from "@/components/HatchShadow";
import { LandingBackground } from "@/components/LandingBackground";
import { RotatingTagline } from "@/components/RotatingTagline";
import { Button } from "@/components/ui/Button";

export type StatusPageTone = "mint" | "warm" | "danger";

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
  /** Fixed copy; omit with `taglineContext` set for a random iconic quote. */
  description?: string;
  /** Show a random quote from this pool when no `description` is given. */
  taglineContext?: "notFound" | "serverError";
  /** Mono quest-log line shown under the panel. */
  logLine?: string;
  tone?: StatusPageTone;
  primary: StatusPageAction;
  secondary?: StatusPageAction;
  /** Full-page ambient layout (default) vs in-shell compact layout. */
  layout?: "full" | "embedded";
  children?: ReactNode;
};

const toneFace: Record<StatusPageTone, string> = {
  mint: "border-[var(--accent)]/25 bg-[var(--accent-dim)]",
  warm: "border-[var(--warm)]/30 bg-[var(--warm)]/10",
  danger: "border-[var(--danger)]/30 bg-[var(--danger)]/10",
};

const toneCode: Record<StatusPageTone, string> = {
  mint: "text-[var(--accent)]",
  warm: "text-[var(--warm)]",
  danger: "text-[var(--danger)]",
};

const hatchPrimaryFace =
  "bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--bg-0)] hover:brightness-110";
const hatchSecondaryFace =
  "border border-[var(--line)] bg-[var(--bg-1)] px-5 py-3 text-sm font-semibold text-[var(--ink)] hover:border-[var(--line-strong)]";

function HatchCta({
  faceClassName,
  label,
  href,
  onClick,
}: {
  faceClassName: string;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const face = (
    <HatchShadow size="sm" faceClassName={faceClassName}>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="m-0 w-full cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-[inherit]"
        >
          {label}
        </button>
      ) : (
        label
      )}
    </HatchShadow>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {face}
      </Link>
    );
  }

  return <span className="inline-block">{face}</span>;
}

function StatusAction({
  action,
  fallbackVariant,
  ctaStyle,
}: {
  action: StatusPageAction;
  fallbackVariant: "primary" | "secondary";
  ctaStyle: "button" | "hatch";
}) {
  const variant = action.variant ?? fallbackVariant;
  const buttonVariant = variant === "primary" ? "primary" : "secondary";

  if (ctaStyle === "hatch") {
    const faceClassName =
      variant === "primary" ? hatchPrimaryFace : hatchSecondaryFace;
    return (
      <HatchCta
        faceClassName={faceClassName}
        label={action.label}
        href={action.href}
        onClick={action.onClick}
      />
    );
  }

  if (action.onClick) {
    return (
      <Button type="button" variant={buttonVariant} onClick={action.onClick}>
        {action.label}
      </Button>
    );
  }

  if (!action.href) return null;

  return (
    <Link href={action.href} className={`btn btn-${buttonVariant}`}>
      {action.label}
    </Link>
  );
}

function StatusContent({
  code,
  eyebrow,
  title,
  description,
  taglineContext,
  logLine,
  tone = "mint",
  primary,
  secondary,
  children,
  ctaStyle,
}: Omit<StatusPageProps, "layout"> & { ctaStyle: "button" | "hatch" }) {
  return (
    <>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
        {eyebrow}
      </p>

      <HatchShadow
        className="mt-5 max-w-lg"
        size="lg"
        faceClassName={`panel border px-6 py-8 sm:px-8 ${toneFace[tone]}`}
      >
        <p
          className={`font-display text-6xl leading-none tracking-tight sm:text-7xl ${toneCode[tone]}`}
          aria-hidden
        >
          {code}
        </p>
        <h1
          id="status-page-title"
          className="mt-4 font-display text-3xl tracking-tight text-[var(--ink)] sm:text-4xl"
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-3 text-[var(--muted)]">{description}</p>
        ) : taglineContext ? (
          <RotatingTagline
            context={taglineContext}
            rotate={false}
            className="mt-3"
          />
        ) : null}
        {children}
      </HatchShadow>

      <div className="mt-8 flex flex-wrap gap-3">
        <StatusAction
          action={primary}
          fallbackVariant="primary"
          ctaStyle={ctaStyle}
        />
        {secondary ? (
          <StatusAction
            action={secondary}
            fallbackVariant="secondary"
            ctaStyle={ctaStyle}
          />
        ) : null}
      </div>

      {logLine ? (
        <p className="mt-8 max-w-lg font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
          {logLine}
        </p>
      ) : null}
    </>
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

  const ctaStyle = layout === "embedded" ? "button" : "hatch";

  if (layout === "embedded") {
    return (
      <section aria-labelledby="status-page-title">
        <StatusContent {...props} ctaStyle={ctaStyle} />
      </section>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <LandingBackground />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <BrandMark href="/" size="md" className="mb-10" />
        <StatusContent {...props} ctaStyle={ctaStyle} />
      </div>
    </div>
  );
}
