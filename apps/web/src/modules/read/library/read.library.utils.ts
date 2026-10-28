import type { ReadLibraryItem } from "@questorylabs/shared";
import { LIBRARY_FORMATS } from "./read.library.constants";

export const formatLabel = (format: string): string =>
  LIBRARY_FORMATS.find((f) => f.value === format)?.label ?? format;

export const libraryItemMeta = (item: ReadLibraryItem): string => {
  const parts = [formatLabel(item.title.format)];
  const ch = item.title.chapters != null ? `${item.progressChapters}/${item.title.chapters}` : `${item.progressChapters}`;
  if (item.progressChapters > 0 || item.title.chapters != null) parts.push(`Ch. ${ch}`);
  if (item.progressVolumes > 0) parts.push(`Vol. ${item.progressVolumes}`);
  if (item.title.category) parts.push(item.title.category);
  if (item.score != null) parts.push(`Score ${item.score}`);
  return parts.join(" · ");
};
