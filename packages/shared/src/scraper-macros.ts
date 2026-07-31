export type ScraperMacroContext = Record<string, string | number>;

/**
 * Renders `{{page}}` and `{{user.field}}` placeholders in scraper URL templates.
 */
export function renderScraperTemplate(
  template: string,
  ctx: ScraperMacroContext,
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, rawKey: string) => {
    const key = rawKey.trim();
    if (key === "page") {
      const page = ctx.page;
      return page != null ? String(page) : "";
    }
    if (key.startsWith("user.")) {
      const userKey = key.slice("user.".length);
      const flat = ctx[`user.${userKey}`];
      const nested = ctx[userKey];
      const val = flat ?? nested;
      return val != null ? String(val) : "";
    }
    const val = ctx[key];
    return val != null ? String(val) : "";
  });
}
