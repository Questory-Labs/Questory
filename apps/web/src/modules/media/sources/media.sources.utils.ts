import type { SourcesTab } from "./media.sources.types";

const LABELS: Record<SourcesTab, string> = { music: "Music", watch: "Watch", read: "Read" };

export const sourcesTabs = (flags: Record<SourcesTab, boolean>) =>
  (Object.keys(LABELS) as SourcesTab[])
    .filter((key) => flags[key])
    .map((value) => ({ value, label: LABELS[value] }));

export const pickSourcesTab = (
  requested: string | null,
  tabs: { value: SourcesTab }[],
): SourcesTab | null =>
  tabs.find((t) => t.value === requested)?.value ?? tabs[0]?.value ?? null;

export const SOURCES_ACCENT: Record<SourcesTab, string> = {
  music: "var(--music)",
  watch: "var(--watch)",
  read: "var(--read)",
};

export const SOURCES_NOUN: Record<SourcesTab, string> = {
  music: "listening",
  watch: "watching",
  read: "reading",
};

export const SOURCES_FLASH_PROVIDERS: Record<string, string> = {
  trakt: "Trakt",
  anilist: "AniList",
  mal: "MyAnimeList",
  kitsu: "Kitsu",
  bangumi: "Bangumi",
  shikimori: "Shikimori",
};

export type SourcesFlashMessage = { provider: string; ok: boolean; text: string };

export const sourcesFlash = (params: URLSearchParams): SourcesFlashMessage[] =>
  Object.entries(SOURCES_FLASH_PROVIDERS).flatMap(([key, label]): SourcesFlashMessage[] => {
    const value = params.get(key);
    if (value === "connected") return [{ provider: key, ok: true, text: `${label} connected.` }];
    if (value === "error") {
      const reason = params.get("reason");
      return [{ provider: key, ok: false, text: `Could not connect ${label}${reason ? `: ${reason}` : ""}.` }];
    }
    return [];
  });

export const sourcesHref = (
  tab: SourcesTab,
  search: Record<string, string | string[] | undefined> = {},
) => {
  const params = new URLSearchParams();
  params.set("tab", tab);
  for (const [key, value] of Object.entries(search)) {
    if (key === "tab" || value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) params.append(key, v);
  }
  return `/sources?${params.toString()}`;
};
