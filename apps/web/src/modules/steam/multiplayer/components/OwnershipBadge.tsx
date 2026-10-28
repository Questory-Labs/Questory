import type { PlanBadgeTone } from "../steam.multiplayer.utils";

export const BADGE_TONE_CLASS: Record<PlanBadgeTone, string> = {
  ok: "text-[var(--ok)]",
  warn: "text-[var(--warn)]",
  music: "text-[var(--music)]",
  read: "text-[var(--read)]",
  faint: "text-[var(--faint)]",
};

export const OwnershipBadge = ({
  label,
  tone,
}: {
  label: string;
  tone: PlanBadgeTone;
}) => (
  <span
    className={`inline-flex items-center gap-1.5 self-start rounded-full border border-white/10 px-2.5 py-[3px] text-[11px] ${BADGE_TONE_CLASS[tone]}`}
  >
    <span aria-hidden="true" className="dot h-[5px] w-[5px]" />
    {label}
  </span>
);
