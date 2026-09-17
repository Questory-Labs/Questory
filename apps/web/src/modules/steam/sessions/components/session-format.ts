export const formatSessionDuration = (secs: number): string => {
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
};

/** Compact X-axis label for a `YYYY-MM-DD` day key. */
export const formatDayAxisLabel = (dayKey: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!m) return dayKey;
  return `${Number(m[2])}/${Number(m[3])}`;
};

/** Y-axis / hover label for hours (chart values, not whole seconds). */
export const formatHoursTick = (hours: number): string => {
  if (hours <= 0) return "0";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded}h`;
};
