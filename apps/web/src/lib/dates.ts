/** Browser-local date display helpers and timezone query helpers. */

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Append `tz=` (IANA) to a path, using the browser zone by default. */
export function withTz(path: string, tz = browserTimeZone()): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}tz=${encodeURIComponent(tz)}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(
  iso: string | null | undefined,
  now = new Date(),
): string {
  if (!iso) return "—";
  const at = new Date(iso);
  const sameYear = at.getFullYear() === now.getFullYear();
  return at.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Local calendar day key `YYYY-MM-DD`. */
export function localDayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Section header: Today, Yesterday, then a readable date. */
export function formatDayHeader(iso: string, now = new Date()): string {
  const day = startOfLocalDay(new Date(iso));
  const today = startOfLocalDay(now);
  const diffDays = Math.round(
    (today.getTime() - day.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  const sameYear = day.getFullYear() === today.getFullYear();
  return day.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/**
 * Per-row time: relative for today, clock time on older days
 * (date lives in the group header).
 */
export function formatRowTime(iso: string, now = new Date()): string {
  const at = new Date(iso);
  const today = startOfLocalDay(now);
  const day = startOfLocalDay(at);
  if (day.getTime() === today.getTime()) {
    const deltaMs = Math.max(0, now.getTime() - at.getTime());
    const mins = Math.floor(deltaMs / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
  }
  return at.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export type DayGroup<T> = {
  dayKey: string;
  label: string;
  items: T[];
};

/** Group items by local calendar day using `getIso`, newest day first. */
export function groupByLocalDay<T>(
  items: T[],
  getIso: (item: T) => string,
  now = new Date(),
): DayGroup<T>[] {
  const groups = new Map<string, DayGroup<T>>();
  for (const item of items) {
    const iso = getIso(item);
    const dayKey = localDayKey(iso);
    let group = groups.get(dayKey);
    if (!group) {
      group = {
        dayKey,
        label: formatDayHeader(iso, now),
        items: [],
      };
      groups.set(dayKey, group);
    }
    group.items.push(item);
  }
  return [...groups.values()];
}
