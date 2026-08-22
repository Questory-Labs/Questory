"use client";

import { ListProviderCard } from "@/components/sources/ListProviderCard";
import { SourcesSectionHeading } from "@/components/sources/SourcesSectionHeading";
import { PageHeader } from "@/components/ui";
import { readFetch, readUrl } from "@/lib/read";
import { MANGA_PROVIDERS, READ_ANILIST } from "./read.settings.constants";

export const ReadSettingsView = () => (
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
          provider={READ_ANILIST}
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
