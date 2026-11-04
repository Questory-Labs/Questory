import { CountUp } from "@questorylabs/ui";
import type { ReactNode } from "react";
import { TONE_TEXT, type AdminTone } from "../admin.tone";

export const AdminStat = ({
  label,
  value,
  tone = "muted",
  valueTone,
  live = false,
  index = 0,
  size = "lg",
}: {
  label: string;
  value: number | ReactNode;
  tone?: AdminTone;
  valueTone?: AdminTone;
  live?: boolean;
  index?: number;
  size?: "lg" | "md";
}) => (
  <div
    className="panel q-lift q-in px-[18px] py-4"
    style={{ "--i": index } as React.CSSProperties}
  >
    <div className="flex items-center justify-between gap-2">
      <p className="label-mono">{label}</p>
      <span className={`dot ${TONE_TEXT[tone]} ${live ? "q-live" : ""}`} aria-hidden />
    </div>
    <p
      className={`mt-3 font-extralight leading-[0.95] tracking-[-0.03em] ${
        size === "lg" ? "text-[40px]" : "text-[30px]"
      } ${valueTone ? TONE_TEXT[valueTone] : "text-[var(--ink)]"}`}
    >
      {typeof value === "number" ? <CountUp value={value} /> : value}
    </p>
  </div>
);
