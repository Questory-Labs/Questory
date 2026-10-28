"use client";

import { CountUp } from "@questorylabs/ui";
import { ListPager } from "@/components/ListPager";
import { EmptyState, PageHeader, ResourceStatus, SkeletonTileGrid, StateMessage } from "@/components/ui";
import { MEDIA_HISTORY_PAGE_SIZE } from "@/lib/pagination";
import { PillSelect } from "@/modules/media/shelf/components/PillSelect";
import { ShelfSearchField } from "@/modules/media/shelf/components/ShelfSearchField";
import { LibraryCard } from "./components/LibraryCard";
import { ReadShelfTabs } from "./components/ReadShelfTabs";
import { StatusChips } from "./components/StatusChips";
import { LIBRARY_CATEGORIES, LIBRARY_FORMATS, LIBRARY_SORTS } from "./read.library.constants";
import type { ReadLibraryViewProps } from "./read.library.types";

export const ReadLibraryView = (props: Record<string, unknown>) => {
  const {
    library,
    page,
    setPage,
    status,
    setStatus,
    format,
    setFormat,
    category,
    setCategory,
    genre,
    setGenre,
    sort,
    setSort,
    qDraft,
    setQDraft,
    onSearch,
  } = props as ReadLibraryViewProps;

  const value = library.value;
  const items = value?.items ?? [];
  const total = value?.total ?? 0;
  const pageSize = value?.pageSize ?? MEDIA_HISTORY_PAGE_SIZE;
  const counts = value?.statusCounts;
  const allTitles = counts ? counts.reduce((a, c) => a + c.count, 0) : null;
  const reading = counts?.find((c) => c.status === "reading")?.count ?? 0;
  const genreOptions = [
    { value: "", label: "All genres" },
    ...(value?.genreOptions ?? []).map((g) => ({ value: g, label: g })),
  ];
  const resetting = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-3.5">
      <PageHeader
        className="mb-0 px-1 pb-2.5 pt-2"
        eyebrow="Read · Library"
        title={
          allTitles != null ? (
            <>
              <CountUp value={allTitles} /> titles,{" "}
              <span className="font-serif text-[#c9d1f6]">
                <CountUp value={reading} /> on the nightstand
              </span>
            </>
          ) : (
            "Library"
          )
        }
        actions={<ReadShelfTabs active="library" />}
      />

      <div className="q-in flex flex-col gap-2.5 [--i:1]">
        <StatusChips value={status} counts={counts} onChange={resetting(setStatus)} />
        <div className="flex flex-wrap items-center gap-2">
          <PillSelect label="Format" value={format} options={LIBRARY_FORMATS} onChange={resetting(setFormat)} />
          <PillSelect label="Category" value={category} options={LIBRARY_CATEGORIES} onChange={resetting(setCategory)} />
          {genreOptions.length > 1 || genre ? (
            <PillSelect label="Genre" value={genre} options={genreOptions} onChange={resetting(setGenre)} />
          ) : null}
          <PillSelect label="Sort" value={sort} options={LIBRARY_SORTS} onChange={resetting(setSort)} />
          <ShelfSearchField
            label="Search library"
            placeholder="Search titles"
            value={qDraft}
            onChange={setQDraft}
            onSubmit={onSearch}
          />
        </div>
      </div>

      <ResourceStatus
        failed={library.failed}
        empty={library.empty}
        loading={<SkeletonTileGrid />}
        error={<StateMessage variant="error">Could not load library.</StateMessage>}
      >
        {items.length === 0 ? (
          <EmptyState
            title="No titles yet"
            description="Connect AniList or another list under Sources to sync your reading list."
          />
        ) : (
          <>
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-3 p-0">
              {items.map((item, i) => (
                <LibraryCard key={item.id} item={item} index={i} />
              ))}
            </ul>
            <ListPager
              page={page}
              total={total}
              pageSize={pageSize}
              disabled={library.refreshing}
              onPageChange={setPage}
            />
          </>
        )}
      </ResourceStatus>
    </div>
  );
};
