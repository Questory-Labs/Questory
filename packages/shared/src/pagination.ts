import { z } from "zod";

export function parsePageParam(
  raw: string | undefined,
  fallback = 1,
): number | null {
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 10_000) {
    return null;
  }
  return n;
}

export function parsePageSizeParam(
  raw: string | undefined,
  fallback = 24,
  max = 100,
): number | null {
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > max) {
    return null;
  }
  return n;
}

export const SteamId64Schema = z
  .string()
  .regex(/^\d{17}$/, "SteamID64 must be 17 digits");
