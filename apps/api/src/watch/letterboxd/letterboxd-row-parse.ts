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

export function yearFromFilmPath(href: string | null | undefined): number | null {
  if (!href) return null;
  const path = href.startsWith("http") ? new URL(href).pathname : href;
  const match = path.match(/-(\d{4})\/?$/);
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
}

export function letterboxdDateFromParts(
  monthLabel: string | null | undefined,
  dayLabel: string | null | undefined,
  yearLabel: string | null | undefined,
): string | null {
  if (!dayLabel?.trim() || !monthLabel?.trim() || !yearLabel?.trim()) {
    return null;
  }
  const month = MONTHS[monthLabel.trim().slice(0, 3).toLowerCase()];
  const year = yearLabel.trim();
  const day = dayLabel.trim().padStart(2, "0");
  if (!month || !/^\d{4}$/.test(year)) return null;
  return `${year}-${month}-${day}`;
}

/** Merge month/year headers across diary rows and build ISO dates. */
export function normalizeLetterboxdScrapeRows(
  rows: Record<string, string | null>[],
): Record<string, string | null>[] {
  let currentMonth: string | null = null;
  let currentYear: string | null = null;

  return rows.map((row) => {
    if (row.month?.trim()) currentMonth = row.month.trim();
    if (row.yearHeader?.trim()) currentYear = row.yearHeader.trim();

    const filmHref = row.filmHref?.trim() || row.filmHrefAlt?.trim() || null;
    const yearFromHref = yearFromFilmPath(filmHref);
    const yearFromTitle = row.year?.trim();
    const year =
      yearFromTitle && Number.isFinite(Number(yearFromTitle))
        ? yearFromTitle
        : yearFromHref != null
          ? String(yearFromHref)
          : null;

    const date =
      letterboxdDateFromParts(currentMonth, row.day, currentYear) ||
      row.date?.trim() ||
      null;

    const rating = row.rating?.trim() || row.ratingClass?.trim() || null;

    return {
      ...row,
      date: date ?? null,
      year,
      rating,
      filmHref,
    };
  });
}
