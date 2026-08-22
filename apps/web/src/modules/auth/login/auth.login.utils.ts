import { sanitizeAppHref } from "@questorylabs/shared";

export const safeNextPath = (raw: string | null): string => {
  if (!raw) return "/dashboard";
  const decoded = (() => {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  })();
  const cleaned = sanitizeAppHref(decoded);
  return cleaned || "/dashboard";
};
