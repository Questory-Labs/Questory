import type { LibraryEntry } from "@questorylabs/shared";
import { formatMoney } from "@/lib/money";

export function formatHours(minutes: number): string {
  const hours = minutes / 60;
  if (hours === 0) return "0";
  if (hours >= 10) return String(Math.round(hours));
  return hours.toFixed(1);
}

export function formatEntryValue(
  entry: Pick<LibraryEntry, "costPerHour" | "valueAmount" | "playtimeForever">,
  currency: string,
): string | null {
  if (entry.costPerHour != null) {
    return `${formatMoney(entry.costPerHour, currency)} / h`;
  }
  if (entry.valueAmount != null && entry.valueAmount > 0 && entry.playtimeForever === 0) {
    return `${formatMoney(entry.valueAmount, currency)} idle`;
  }
  return null;
}

export function achievementShare(
  entry: Pick<LibraryEntry, "achievementPct" | "achievementTotal">,
): number | null {
  if (entry.achievementPct == null || !entry.achievementTotal) return null;
  return Math.max(0, Math.min(1, entry.achievementPct / 100));
}
