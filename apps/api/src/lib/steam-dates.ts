/** Parse Steam store `release_date.date` strings into a Date, or null. */
export function parseSteamReleaseDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const raw = dateStr.trim();
  if (!raw || /coming soon|tba|to be announced|q[1-4]\s+\d{4}/i.test(raw)) {
    return null;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function releaseYearFromDate(date?: Date | string | null): number | null {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.getFullYear();
}
