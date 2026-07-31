import type { ScraperFieldRule } from "@questorylabs/shared";
import { applyFieldRegex, applyFieldTransform } from "./scraper-transforms";

type CheerioNode = {
  length: number;
  text(): string;
  html(): string | null;
  attr(name: string): string | undefined;
};

type CheerioSelection = CheerioNode & {
  find(selector: string): CheerioSelection;
  first(): CheerioSelection;
  each(callback: (index: number, element: unknown) => void): void;
};

export type ScraperDom = (selector: string) => CheerioSelection;

function readAttr($el: CheerioSelection, rule: ScraperFieldRule): string | null {
  switch (rule.attr) {
    case "text":
      return $el.text().trim() || null;
    case "html":
      return $el.html()?.trim() || null;
    case "href":
      return $el.attr("href") ?? null;
    case "class":
      return ($el.attr("class") ?? "").trim() || null;
    case "attr":
      return rule.attrName ? ($el.attr(rule.attrName) ?? null) : null;
    default:
      return $el.text().trim() || null;
  }
}

export function extractItemFields(
  $: ScraperDom,
  el: unknown,
  fields: ScraperFieldRule[],
): Record<string, string | null> {
  const $root = $(el as never);
  const row: Record<string, string | null> = {};
  for (const rule of fields) {
    const $field = $root.find(rule.selector).first();
    const raw = $field.length ? readAttr($field, rule) : null;
    const matched = applyFieldRegex(rule.regex, raw);
    row[rule.name] = applyFieldTransform(rule.transform, matched);
  }
  return row;
}

export function extractPageItems(
  $: ScraperDom,
  itemSelector: string,
  fields: ScraperFieldRule[],
): Record<string, string | null>[] {
  const rows: Record<string, string | null>[] = [];
  $(itemSelector).each((_, el) => {
    rows.push(extractItemFields($, el, fields));
  });
  return rows;
}
