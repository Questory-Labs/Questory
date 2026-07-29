"use client";

import {
  ListProviderCard,
  type ListProviderConfig,
} from "@/components/sources/ListProviderCard";
import { SourcesSectionHeading } from "@/components/sources/SourcesSectionHeading";
import { watchFetch, watchUrl } from "@/lib/watch";

const PROVIDERS: ListProviderConfig[] = [
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

export function AnimeListSourcesSection() {
  return (
    <section className="mb-10">
      <SourcesSectionHeading
        eyebrow="Anime lists"
        title="MAL, Kitsu, Bangumi, Shikimori"
        description="Import anime into Watch and manga into Read from additional list providers."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {PROVIDERS.map((provider) => (
          <ListProviderCard
            key={provider.id}
            provider={provider}
            queryKeyPrefix="watch"
            fetchFn={watchFetch}
            urlFn={watchUrl}
          />
        ))}
      </div>
    </section>
  );
}
