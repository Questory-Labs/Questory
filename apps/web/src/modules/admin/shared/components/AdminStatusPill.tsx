import type { ReactNode } from "react";
import { TONE_GLOW, TONE_TEXT, type AdminTone } from "../admin.tone";

export const AdminStatusPill = ({
  tone,
  live = false,
  children,
}: {
  tone: AdminTone;
  live?: boolean;
  children: ReactNode;
}) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-0.5 text-xs ${TONE_TEXT[tone]}`}
  >
    <span className={`dot h-[5px] w-[5px] ${live ? "q-live" : ""}`} aria-hidden />
    {children}
  </span>
);

export const AdminStatusDot = ({ tone, live = false }: { tone: AdminTone; live?: boolean }) => (
  <span
    className={`dot ${TONE_TEXT[tone]} ${TONE_GLOW[tone]} ${live ? "q-live" : ""}`}
    aria-hidden
  />
);
