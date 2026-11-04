import type { LibraryUserStatus } from "@questorylabs/shared";
import { cn } from "@questorylabs/ui";
import {
  LIBRARY_STATUS_LABELS,
  LIBRARY_STATUS_TONE,
} from "../steam.library.constants";

export const LibraryStatusPill = ({
  status,
  neverPlayed,
  className,
}: {
  status: LibraryUserStatus | null;
  neverPlayed?: boolean;
  className?: string;
}) => {
  if (!status && !neverPlayed) return null;
  const label = status ? LIBRARY_STATUS_LABELS[status] : "Never played";
  const tone = status ? LIBRARY_STATUS_TONE[status] : "text-[var(--faint)]";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[rgba(10,10,11,0.7)] px-2.5 py-0.5 text-[11px] backdrop-blur-md",
        tone,
        className,
      )}
    >
      <span aria-hidden="true" className="h-[5px] w-[5px] rounded-full bg-current" />
      {label}
    </span>
  );
};
