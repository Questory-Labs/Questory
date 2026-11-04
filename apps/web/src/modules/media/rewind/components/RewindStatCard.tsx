"use client";

import type { CSSProperties } from "react";

export const RewindStatCard = ({
  title,
  value,
  subtitle,
  index = 0,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  index?: number;
}) => (
  <div
    className="panel q-lift q-in min-w-0 px-[18px] py-4"
    style={{ "--i": 4 + index } as CSSProperties}
  >
    <h3 className="label-mono m-0">{title}</h3>
    <p className="num-light mt-3 truncate text-[30px] leading-none" title={String(value)}>
      {value}
    </p>
    <p className="mt-1.5 min-h-[18px] text-xs text-muted">{subtitle}</p>
  </div>
);
