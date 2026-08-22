"use client";

import Link from "next/link";
import { ListPager } from "@/components/ListPager";
import { Button, EmptyState, PageHeader, ResourceStatus, SkeletonListRows, StateMessage } from "@/components/ui";
import { MEDIA_HISTORY_PAGE_SIZE } from "@/lib/pagination";
import {
  LIBRARY_CATEGORIES,
  LIBRARY_FORMATS,
  LIBRARY_STATUSES,
} from "./read.library.constants";
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
    qDraft,
    setQDraft,
    onSearch,
  } = props as ReadLibraryViewProps;

  const items = library.value?.items ?? [];
  const total = library.value?.total ?? 0;
  const pageSize = library.value?.pageSize ?? MEDIA_HISTORY_PAGE_SIZE;

  return (
    <>
      <PageHeader
        title="Library"
        description="Your manga and print list from AniList."
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as typeof status);
            setPage(1);
          }}
          className="rounded border border-[var(--line)] bg-[var(--bg-1)] px-2 py-1.5 text-sm text-[var(--ink)]"
        >
          {LIBRARY_STATUSES.map((s) => (
            <option key={s.label} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={format}
          onChange={(e) => {
            setFormat(e.target.value);
            setPage(1);
          }}
          className="rounded border border-[var(--line)] bg-[var(--bg-1)] px-2 py-1.5 text-sm text-[var(--ink)]"
        >
          {LIBRARY_FORMATS.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="rounded border border-[var(--line)] bg-[var(--bg-1)] px-2 py-1.5 text-sm text-[var(--ink)]"
        >
          {LIBRARY_CATEGORIES.map((c) => (
            <option key={c.label} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch();
          }}
        >
          <input
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder="Search titles…"
            className="w-48 rounded border border-[var(--line)] bg-[var(--bg-1)] px-2 py-1.5 text-sm text-[var(--ink)]"
          />
          <Button type="submit" variant="secondary" className="px-3 py-1.5">
            Search
          </Button>
        </form>
      </div>

      <ResourceStatus
        failed={library.failed}
        empty={library.empty}
        loading={<SkeletonListRows />}
        error={
          <StateMessage variant="error">Could not load library.</StateMessage>
        }
      >
        {items.length === 0 ? (
          <EmptyState
            title="No titles yet"
            description="Connect AniList under Read → Sources to sync your manga list."
          />
        ) : (
          <>
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-3 border-b border-[var(--line)] pb-3 text-sm"
                >
                  {item.title.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.title.coverUrl}
                      alt=""
                      className="h-16 w-12 shrink-0 object-cover"
                    />
                  ) : (
                    <div className="h-16 w-12 shrink-0 bg-[var(--bg-2)]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <Link
                        href={`/read/titles/${item.title.id}`}
                        className="text-[var(--ink)] hover:text-[var(--accent)]"
                      >
                        {item.title.name}
                      </Link>
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
                        {item.listStatus} · {item.title.format}
                        {item.title.category && ` · ${item.title.category}`}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                      Ch. {item.progressChapters}
                      {item.title.chapters != null
                        ? ` / ${item.title.chapters}`
                        : ""}
                      {item.progressVolumes > 0
                        ? ` · Vol. ${item.progressVolumes}`
                        : ""}
                      {item.score != null ? ` · Score ${item.score}` : ""}
                    </p>
                  </div>
                </li>
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
    </>
  );
};
