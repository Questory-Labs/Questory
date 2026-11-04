export function percentDelta(current: number, previous: number): number {
  if (previous > 0) {
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }
  return current > 0 ? 100 : 0;
}
