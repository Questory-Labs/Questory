import { formatDateTime } from "@/lib/dates";
import {
  LETTERBOXD_KINDS,
  type LetterboxdKind,
} from "./watch.settings.constants";
import type { LiveSourceId, UnusedSource } from "./watch.settings.types";

export const kindFromFileName = (name: string): LetterboxdKind | null => {
  const base = name.replace(/\\/g, "/").split("/").pop()?.toLowerCase() || "";
  const hit = LETTERBOXD_KINDS.find((k) => k.label === base);
  return hit?.id ?? null;
};

export const isLetterboxdFile = (file: File) => {
  const lower = file.name.toLowerCase();
  return (
    lower.endsWith(".zip") ||
    lower.endsWith(".csv") ||
    file.type === "application/zip" ||
    file.type === "text/csv"
  );
};

export const includeFromFile = (
  file: File,
): Record<LetterboxdKind, boolean> => {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv")) {
    const kind = kindFromFileName(file.name) ?? "diary";
    return {
      diary: kind === "diary",
      ratings: kind === "ratings",
      watched: kind === "watched",
      watchlist: kind === "watchlist",
    };
  }
  return {
    diary: true,
    ratings: true,
    watched: false,
    watchlist: true,
  };
};

export const formatLastSync = (value?: string | null) => {
  if (!value) return "never";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : formatDateTime(value);
};

export const letterboxdImportTone = (importMsg: string | null) => ({
  importOk: importMsg?.startsWith("Imported") ?? false,
  importFailed:
    importMsg != null &&
    !importMsg.startsWith("Imported") &&
    !importMsg.startsWith("Import"),
});

export const watchLiveSourceState = ({
  traktConnected,
  anilistConnected,
  webhookActive,
  expanded,
}: {
  traktConnected: boolean;
  anilistConnected: boolean;
  webhookActive: boolean;
  expanded: Partial<Record<LiveSourceId, boolean>>;
}) => {
  const showTrakt = traktConnected || Boolean(expanded.trakt);
  const showAnilist = anilistConnected || Boolean(expanded.anilist);
  const showWebhook = webhookActive || Boolean(expanded.webhook);
  const showingLive = showTrakt || showAnilist || showWebhook;
  const unused: UnusedSource[] = [];
  if (!traktConnected) {
    unused.push({
      id: "trakt",
      label: "Trakt",
      hint: "OAuth · watched history sync",
    });
  }
  if (!anilistConnected) {
    unused.push({
      id: "anilist",
      label: "AniList",
      hint: "OAuth · anime + manga",
    });
  }
  if (!webhookActive) {
    unused.push({
      id: "webhook",
      label: "Plex / Jellyfin",
      hint: "Live webhooks",
    });
  }
  const chooserOptions = unused.filter((opt) => {
    if (opt.id === "trakt") return !showTrakt;
    if (opt.id === "anilist") return !showAnilist;
    return !showWebhook;
  });
  return {
    showTrakt,
    showAnilist,
    showWebhook,
    showingLive,
    chooserOptions,
  };
};
