/** Opt-in enterprise UI flag (`ENTERPRISE=true`). Resolved at call time for Docker runtime env. */
import { runtimeEnv } from "@/lib/runtime-env";

export function isEnterpriseEnvTrue(value: string | undefined): boolean {
  const v = (value || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function isEnterpriseFlagEnabled(): boolean {
  return isEnterpriseEnvTrue(
    runtimeEnv("ENTERPRISE") || process.env.ENTERPRISE,
  );
}
