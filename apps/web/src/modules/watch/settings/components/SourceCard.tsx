import type { ReactNode } from "react";
import { SourceRow, type SourceTone } from "@/modules/media/sources/components/SourceRow";

export const SourceCard = ({
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
