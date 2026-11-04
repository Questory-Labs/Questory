"use client";

import type { FeatureSource } from "@questorylabs/shared";
import { SourcesSectionHeading } from "@/components/sources/SourcesSectionHeading";
import { useFeatureSources } from "@/hooks/useFeatureSources";
import { sourceEnabled } from "@/lib/app-status";
import { readFetch, readUrl } from "@/lib/read";
import { ListProviderRow } from "@/modules/media/sources/components/ListProviderRow";
import { MANGA_PROVIDERS, READ_ANILIST } from "./read.settings.constants";

export const ReadSettingsView = () => {
  const sources = useFeatureSources();
  const showAnilist = sourceEnabled(sources, "anilist");
  const mangaProviders = MANGA_PROVIDERS.filter((provider) =>
    sourceEnabled(sources, provider.id as FeatureSource),
  );

  return (
    <>
      <p className="mb-6 text-sm text-[var(--muted)]">
        Connect anime/manga list providers to sync manga into Read. Anime from the same connections syncs into Watch.
      </p>

      {showAnilist ? (
        <section className="mb-10">
          <SourcesSectionHeading
            eyebrow="Live"
            title="Live sources"
            description="Active connections that sync ongoing manga (and shared Watch anime)."
          />
          <div className="flex flex-col gap-2.5">
            <ListProviderRow
              provider={READ_ANILIST}
              queryKeyPrefix="read"
              fetchFn={readFetch}
              urlFn={readUrl}
            />
          </div>
        </section>
      ) : null}

      {mangaProviders.length ? (
        <section>
          <SourcesSectionHeading
            eyebrow="Manga lists"
            title="MAL, Kitsu, Bangumi, Shikimori"
            description="Import manga into Read from additional list providers. Anime from the same connections syncs into Watch."
          />
          <div className="flex flex-col gap-2.5">
            {mangaProviders.map((provider) => (
              <ListProviderRow
                key={provider.id}
                provider={provider}
                queryKeyPrefix="read"
                fetchFn={readFetch}
                urlFn={readUrl}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
};
