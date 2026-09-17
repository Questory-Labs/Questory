import type { ReactNode } from "react";

/** Slot layout for Music / Watch / Read homes — not a domain enum kitchen. */
export const MediaHomeSlots = ({
  header,
  hero,
  kpis,
  charts,
}: {
  header: ReactNode;
  hero?: ReactNode;
  kpis?: ReactNode;
  charts?: ReactNode;
}) => (
  <>
    {header}
    {hero}
    {kpis}
    {charts}
  </>
);
