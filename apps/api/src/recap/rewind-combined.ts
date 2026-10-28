import type {
  RewindAllDailyBucket,
  RewindAllStats,
} from "@questorylabs/shared";

type DomainKey = keyof RewindAllStats["domains"];

export function combineDaily(domains: RewindAllStats["domains"]): RewindAllDailyBucket[] {
  const byDate = new Map<string, RewindAllDailyBucket>();
  for (const key of Object.keys(domains) as DomainKey[]) {
    for (const bucket of domains[key]?.monthly ?? []) {
      const row = byDate.get(bucket.month) ?? { date: bucket.month, counts: {} };
      row.counts[key] = (row.counts[key] ?? 0) + bucket.count;
      byDate.set(bucket.month, row);
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function busiestSincePeriod(
  current: number,
  prior: { period: string; count: number }[],
): string | null {
  if (current <= 0) return null;
  for (let i = 0; i < prior.length; i += 1) {
    const row = prior[i]!;
    if (row.count > current) return i === 0 ? null : row.period;
  }
  if (!prior.some((row) => row.count > 0)) return null;
  return prior[prior.length - 1]!.period;
}
