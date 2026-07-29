export function resolveProviderDate(entry: {
  updatedAt?: string | number | null;
  finishedAt?: string | null;
  completedAt?: { year?: number; month?: number; day?: number } | null;
}): Date {
  const c = entry.completedAt;
  if (c?.year) {
    const m = c.month ?? 1;
    const d = c.day ?? 1;
    return new Date(Date.UTC(c.year, m - 1, d, 12, 0, 0));
  }
  if (entry.finishedAt) {
    const d = new Date(entry.finishedAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (typeof entry.updatedAt === "number") {
    return new Date(entry.updatedAt * 1000);
  }
  if (typeof entry.updatedAt === "string") {
    const d = new Date(entry.updatedAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}
