export type RuntimeEnvKey =
  | "NEXT_PUBLIC_API_URL"
  | "NEXT_PUBLIC_ENTERPRISE_URL"
  | "NEXT_PUBLIC_ENABLE_MUSIC"
  | "NEXT_PUBLIC_ENABLE_WATCH"
  | "NEXT_PUBLIC_ENABLE_READ"
  | "ENTERPRISE";

export type RuntimeEnv = Partial<Record<RuntimeEnvKey, string>>;

declare global {
  interface Window {
    __QUESTORY_RUNTIME__?: RuntimeEnv;
  }
}

/**
 * Read a public config value at call time.
 * - Browser: window.__QUESTORY_RUNTIME__ (from /runtime-env.js, written on container start)
 * - Server/tests: dynamic process.env[key] (avoids Next build-time NEXT_PUBLIC_* inlining)
 */
export function runtimeEnv(key: RuntimeEnvKey): string | undefined {
  if (typeof window !== "undefined") {
    const fromWindow = window.__QUESTORY_RUNTIME__?.[key];
    if (typeof fromWindow === "string" && fromWindow.length > 0) {
      return fromWindow;
    }
  }
  const fromProcess = process.env[key];
  if (typeof fromProcess === "string" && fromProcess.length > 0) {
    return fromProcess;
  }
  return undefined;
}

export function getApiUrl(): string {
  return (
    runtimeEnv("NEXT_PUBLIC_API_URL") ||
    // Dev / legacy build inlining when runtime script is empty
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000"
  );
}

export function getEnterpriseUrl(): string {
  const raw =
    runtimeEnv("NEXT_PUBLIC_ENTERPRISE_URL") ||
    process.env.NEXT_PUBLIC_ENTERPRISE_URL ||
    "http://localhost:4030";
  return raw.replace(/\/+$/, "");
}

export function isRuntimeFlagTrue(key: RuntimeEnvKey): boolean {
  const v = (runtimeEnv(key) || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}
