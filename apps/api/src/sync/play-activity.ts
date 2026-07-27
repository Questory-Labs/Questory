/** Truncate to the start of the UTC hour for snapshot bucketing/dedupe. */
export function truncateToUtcHour(d: Date): Date {
  const t = new Date(d);
  t.setUTCMinutes(0, 0, 0);
  return t;
}
