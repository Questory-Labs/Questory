"use client";

import type { ListProviderConfig } from "@/components/sources/ListProviderCard";
import { ListProviderRow } from "@/modules/media/sources/components/ListProviderRow";
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

export const AnimeListSourcesSection = ({
  allowed,
}: {
  allowed?: Partial<Record<"mal" | "kitsu" | "shikimori" | "bangumi", boolean>>;
}) => {
  const providers = PROVIDERS.filter(
    (provider) => allowed?.[provider.id as "mal" | "kitsu" | "shikimori" | "bangumi"] !== false,
  );
  if (!providers.length) return null;

  return (
    <section className="mb-10">
      <SourcesSectionHeading
        eyebrow="Anime lists"
        title="MAL, Kitsu, Bangumi, Shikimori"
        description="Import anime into Watch and manga into Read from additional list providers."
      />
      <div className="flex flex-col gap-2.5">
        {providers.map((provider) => (
          <ListProviderRow
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
