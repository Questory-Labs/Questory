"use client";

import type { ReactNode } from "react";
import { PageHeader } from "@questorylabs/ui";
import { CURRENT_YEAR, MONTHS, REWIND_START_YEAR } from "../media.rewind.constants";
import type { RewindMonth } from "../media.rewind.types";

const pillLabel =
  "flex min-h-[42px] items-center gap-1.5 rounded-full border border-white/8 bg-black/25 px-3.5 text-[13px] text-muted";
const pillSelect =
  "border-0 bg-transparent text-[13px] text-ink outline-none disabled:opacity-50 [&>option]:bg-[var(--bg-1)]";

export const RewindHeader = ({
  eyebrow,
  titleLead,
  accentColor,
  year,
  month,
  availableMonths,
  monthDisabled,
  onYearChange,
  onMonthChange,
  share,
}: {
  eyebrow: string;
  titleLead: string;
  accentColor: string;
  year: number;
  month: RewindMonth;
  availableMonths: number[];
  monthDisabled: boolean;
  onYearChange: (year: number) => void;
  onMonthChange: (month: RewindMonth) => void;
  share: ReactNode;
}) => {
  const years = Array.from(
    { length: CURRENT_YEAR - REWIND_START_YEAR + 1 },
    (_, i) => REWIND_START_YEAR + i,
  ).reverse();
  return (
    <PageHeader
      className="!mb-0 px-1 pb-1 pt-2"
      eyebrow={eyebrow}
      title={
        <>
          {titleLead}{" "}
          <em className="font-serif" style={{ color: accentColor }}>
            Rewind
          </em>
        </>
      }
      actions={
        <>
          <label className={pillLabel}>
            Month
            <select
              value={month}
              onChange={(e) =>
                onMonthChange(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))
              }
              disabled={monthDisabled}
              className={pillSelect}
            >
              {year < CURRENT_YEAR ? <option value="all">All year</option> : null}
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {MONTHS[m - 1]?.label ?? m}
                </option>
              ))}
            </select>
          </label>
          <label className={pillLabel}>
            Year
            <select
              value={year}
              onChange={(e) => onYearChange(parseInt(e.target.value, 10))}
              className={pillSelect}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          {share}
        </>
      }
    />
  );
};
