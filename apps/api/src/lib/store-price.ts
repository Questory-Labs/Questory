/** Normalize ITAD/Steam price to major currency units (e.g. 565 INR, not 56500 paise). */
export function normalizeMajorPrice(
  amount: number | null | undefined,
  amountInt?: number | null,
): number | null {
  if (amount == null || Number.isNaN(amount)) return null;
  if (amount <= 0) return amount;

  if (
    amountInt != null &&
    amountInt > 0 &&
    Math.abs(amount - amountInt) < 0.01
  ) {
    return amount / 100;
  }

  if (amount >= 1000 && Number.isInteger(amount) && amount % 100 === 0) {
    const scaled = amount / 100;
    if (scaled > 0 && scaled <= 50_000) return scaled;
  }

  return amount;
}

const SOFT_CEILINGS: Record<string, number> = {
  INR: 15_000,
  USD: 200,
  EUR: 200,
  GBP: 200,
};

/** Flag prices that are likely wrong scale vs Steam or regional norms. */
export function isSuspiciousPrice(
  amount: number,
  currency: string,
  steamMajor?: number | null,
): boolean {
  if (!Number.isFinite(amount) || amount < 0) return true;

  if (steamMajor != null && steamMajor > 0) {
    const ratio = amount / steamMajor;
    return ratio > 20 || ratio < 0.05;
  }

  const code = (currency || "USD").trim().toUpperCase();
  const ceiling = SOFT_CEILINGS[code] ?? 200;
  return amount > ceiling;
}
