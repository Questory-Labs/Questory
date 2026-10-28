import type { ReactNode } from "react";
import { SourceRow, SourceStatusPill, type SourceTone } from "@/modules/media/sources/components/SourceRow";

export const MusicStatusPill = SourceStatusPill;

export const MusicSourceCard = ({
  label,
  title,
  blurb,
  status,
  tone,
  action,
  children,
}: {
  label: string;
  title: string;
  blurb: string;
  status: ReactNode;
  tone?: SourceTone;
  action?: ReactNode;
  children?: ReactNode;
}) => (
  <SourceRow label={label} title={title} blurb={blurb} status={status} tone={tone} action={action}>
    {children}
  </SourceRow>
);

export const MusicSectionHeading = ({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) => (
    <div className="mb-3 px-1">
      <div className="label-mono text-[10px] text-[var(--faint)]">{eyebrow}</div>
      <h2 className="mt-1 text-[17px] font-normal text-[var(--ink)]">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">{description}</p>
    </div>
  );

