import type { ListProviderConfig } from "@/components/sources/ListProviderCard";

export const READ_ANILIST: ListProviderConfig = {
  id: "anilist",
  title: "AniList",
  blurb:
    "Connect AniList to sync manga into Read (anime syncs into Watch when enabled).",
  statusPath: "/anilist/status",
  authorizePath: "/anilist/authorize",
};

export const MANGA_PROVIDERS: ListProviderConfig[] = [
  {
    id: "mal",
    title: "MyAnimeList",
    blurb: "OAuth · anime + manga lists",
    statusPath: "/mal/status",
    authorizePath: "/mal/authorize",
  },
  {
    id: "shikimori",
    title: "Shikimori",
    blurb: "OAuth · anime + manga lists",
    statusPath: "/shikimori/status",
    authorizePath: "/shikimori/authorize",
  },
  {
    id: "bangumi",
    title: "Bangumi",
    blurb: "OAuth · anime + manga collections",
    statusPath: "/bangumi/status",
    authorizePath: "/bangumi/authorize",
  },
  {
    id: "kitsu",
    title: "Kitsu",
    blurb: "Email + password · library sync",
    statusPath: "/kitsu/status",
    passwordConnect: true,
  },
];
