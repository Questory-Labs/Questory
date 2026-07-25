/** True when CRON_ENABLED is true, TRUE, or 1. */
export function isCronEnabled(): boolean {
  const raw = (process.env.CRON_ENABLED || "").trim();
  return raw === "true" || raw === "TRUE" || raw === "1";
}
