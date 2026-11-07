import { sourcesFlashReason } from "@/modules/media/sources/media.sources.utils";
export const isMusicImportFile = (file: File) => {
  const lower = file.name.toLowerCase();
  return (
    lower.endsWith(".db") ||
    lower.endsWith(".sqlite") ||
    lower.endsWith(".sqlite3") ||
    lower.endsWith(".json") ||
    lower.endsWith(".zip") ||
    file.type === "application/json" ||
    file.type === "application/zip" ||
    file.type === "application/x-sqlite3" ||
    file.type === "application/vnd.sqlite3"
  );
};

export const lastfmFlashFromParams = (params: URLSearchParams): string | null => {
  const lastfm = params.get("lastfm");
  if (lastfm === "connected") return "connected";
  if (lastfm !== "error") return null;
  return sourcesFlashReason(params.get("reason")) ?? "error";
};
