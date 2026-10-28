import { previousRewindPeriod } from "@questorylabs/shared";
import { MONTHS } from "./media.rewind.constants";

export const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const dayLabel = (date: string): string => {
  const [, m, d] = date.split("-");
  const month = MONTH_SHORT[Number(m) - 1];
  return month && d ? `${month} ${Number(d)}` : date;
};

export const bucketLabel = (key: string): string => {
  const parts = key.split("-");
  if (parts.length === 3) return dayLabel(key);
  return MONTH_SHORT[Number(parts[1]) - 1] ?? key;
};

export const periodLabel = (period: string): string => {
  const [y, m] = period.split("-");
  if (!m) return y ?? period;
  return `${MONTH_SHORT[Number(m) - 1] ?? m} ${y}`;
};

export const longPeriodLabel = (period: string): string => {
  const [y, m] = period.split("-");
  if (!m) return y ?? period;
  return `${MONTHS[Number(m) - 1]?.label ?? m} ${y}`;
};

export const priorLabel = (period: string): string => {
  try {
    return periodLabel(previousRewindPeriod(period));
  } catch {
    return "last period";
  }
};

export const hoursValue = (minutes: number): { value: number; decimals: number } =>
  minutes >= 600
    ? { value: Math.round(minutes / 60), decimals: 0 }
    : { value: Math.round(minutes / 6) / 10, decimals: 1 };

export const formatHours = (minutes: number): string => {
  const { value, decimals } = hoursValue(minutes);
  return `${value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}h`;
};

export const formatCount = (n: number): string => n.toLocaleString("en-US");

export const signedPct = (pct: number): string => `${pct > 0 ? "+" : ""}${pct}%`;
