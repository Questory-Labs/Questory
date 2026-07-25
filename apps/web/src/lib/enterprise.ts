/** Opt-in enterprise UI flag (`ENTERPRISE=true`). Exposed to the client via next.config. */
export const ENTERPRISE_FLAG_ENABLED = isEnterpriseEnvTrue(
  process.env.ENTERPRISE,
);

export function isEnterpriseEnvTrue(value: string | undefined): boolean {
  const v = (value || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}
