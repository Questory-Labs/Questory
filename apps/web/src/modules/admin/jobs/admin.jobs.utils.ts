const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const shortDate = (date: Date) =>
  date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

export const relativeTime = (
  iso: string | null | undefined,
  now = Date.now(),
) => {
  if (!iso) return "—";
  const date = new Date(iso);
  const time = date.getTime();
  if (Number.isNaN(time)) return "—";
  const diff = time - now;
  const abs = Math.abs(diff);
  if (abs < MINUTE) return diff > 0 ? "in <1 min" : "just now";
  if (abs >= 30 * DAY) return shortDate(date);
  const amount =
    abs < HOUR
      ? `${Math.round(abs / MINUTE)} min`
      : abs < DAY
        ? `${Math.round(abs / HOUR)} h`
        : `${Math.round(abs / DAY)} d`;
  return diff > 0 ? `in ${amount}` : `${amount} ago`;
};

export const durationLabel = (
  startedAt: string | null | undefined,
  finishedAt: string | null | undefined,
) => {
  if (!startedAt || !finishedAt) return null;
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (Number.isNaN(ms) || ms < 0) return null;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const rest = seconds % 60;
    return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes ? `${hours}h ${restMinutes}m` : `${hours}h`;
};
