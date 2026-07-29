"use client";

import {
  ListProviderCard,
  type ListProviderConfig,
} from "@/components/sources/ListProviderCard";
import { SourcesSectionHeading } from "@/components/sources/SourcesSectionHeading";
import { PageHeader } from "@/components/ui";
import { readFetch, readUrl } from "@/lib/read";

const ANILIST: ListProviderConfig = {
  id: "anilist",
  title: "AniList",
  blurb:
    "Connect AniList to sync manga into Read (anime syncs into Watch when enabled).",
  statusPath: "/anilist/status",
  authorizePath: "/anilist/authorize",
};

const MANGA_PROVIDERS: ListProviderConfig[] = [
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

export default function ReadSettingsPage() {
  return (
    <>
      <PageHeader
        title="Sources"
        description="Connect anime/manga list providers to sync manga into Read. Anime from the same connections syncs into Watch."
      />

      <section className="mb-10">
        <SourcesSectionHeading
          eyebrow="Live"
          title="Live sources"
          description="Active connections that sync ongoing manga (and shared Watch anime)."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <ListProviderCard
            provider={ANILIST}
            queryKeyPrefix="read"
            fetchFn={readFetch}
            urlFn={readUrl}
          />
        </div>
      </section>

      <section>
        <SourcesSectionHeading
          eyebrow="Manga lists"
          title="MAL, Kitsu, Bangumi, Shikimori"
          description="Import manga into Read from additional list providers. Anime from the same connections syncs into Watch."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {MANGA_PROVIDERS.map((provider) => (
            <ListProviderCard
              key={provider.id}
              provider={provider}
              queryKeyPrefix="read"
              fetchFn={readFetch}
              urlFn={readUrl}
            />
          ))}
        </div>
      </section>
    </>
  );
}
