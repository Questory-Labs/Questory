/** True unless CRON_ENABLED is explicitly false, FALSE, or 0. Empty/unset → on. */
export function isCronEnabled(): boolean {
  const raw = (process.env.CRON_ENABLED || "").trim();
  if (!raw) return true;
  return !(raw === "false" || raw === "FALSE" || raw === "0");
}
