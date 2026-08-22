/** Prefer a user override, then the canonical name. */
export const displayLabel = (
  displayName: string | null | undefined,
  name: string,
): string => displayName?.trim() || name;
