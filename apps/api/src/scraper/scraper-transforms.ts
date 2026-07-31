const MONTHS: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

export function applyFieldTransform(
  transform: string | undefined,
  raw: string | null,
): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  switch (transform) {
    case "number": {
      const n = Number(trimmed.replace(/,/g, ""));
      return Number.isFinite(n) ? String(n) : null;
    }
    case "stars": {
      const half = trimmed.match(/rated-(\d+)/i);
      if (half) return String(Number(half[1]) / 2);
      const filled = (trimmed.match(/★/g) ?? []).length;
      const halfStar = trimmed.includes("½") ? 0.5 : 0;
      if (filled || halfStar) return String(filled + halfStar);
      const n = Number(trimmed);
      return Number.isFinite(n) ? String(n) : null;
    }
    case "ratedClass": {
      const match = trimmed.match(/rated-(\d+)/i);
      if (!match) return null;
      return String(Number(match[1]) / 2);
    }
    case "slugFromHref": {
      const path = trimmed.startsWith("http")
        ? new URL(trimmed).pathname
        : trimmed;
      const parts = path.split("/").filter(Boolean);
      const filmIdx = parts.indexOf("film");
      if (filmIdx >= 0 && parts[filmIdx + 1]) return parts[filmIdx + 1];
      return parts.at(-1) ?? null;
    }
    case "letterboxdDateHref":
    case "date": {
      const iso = trimmed.match(/(\d{4}-\d{2}-\d{2})/);
      if (iso) return iso[1];
      const slash = trimmed.match(/(\d{4})\/([a-z]{3})\/(\d{1,2})/i);
      if (slash) {
        const month = MONTHS[slash[2].toLowerCase()];
        if (!month) return null;
        const day = slash[3].padStart(2, "0");
        return `${slash[1]}-${month}-${day}`;
      }
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
      }
      return null;
    }
    default:
      return trimmed;
  }
}

export function applyFieldRegex(
  regex: string | undefined,
  raw: string | null,
): string | null {
  if (raw == null) return null;
  if (!regex) return raw.trim() || null;
  const match = raw.match(new RegExp(regex));
  if (!match) return null;
  return (match[1] ?? match[0]).trim() || null;
}
