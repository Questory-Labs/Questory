export function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function stringifyStringArray(values: string[] | undefined | null): string {
  return JSON.stringify(values || []);
}

export function includesIgnoreCase(list: string[], needle: string) {
  const n = needle.toLowerCase();
  return list.some((item) => item.toLowerCase() === n);
}

export function containsIgnoreCase(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}
