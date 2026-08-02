export function formatMoney(
  n: number | null | undefined,
  currency = "USD",
  options?: { compact?: boolean }
): string {
  if (n == null || Number.isNaN(n)) return "—";
  const code = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: options?.compact ? 1 : 2,
      notation: options?.compact ? "compact" : "standard",
    }).format(n);
  } catch {
    return `${code} ${n.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: options?.compact ? 1 : 2,
      notation: options?.compact ? "compact" : "standard",
    })}`;
  }
}
