"use client";

import Link from "next/link";
import { useState } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import type { ReadLibraryPage, ReadListStatus } from "@questorylabs/shared";
import { Button, EmptyState, PageHeader, StateMessage } from "@/components/ui";
import { readFetch } from "@/lib/read";
import { MEDIA_HISTORY_PAGE_SIZE } from "@/lib/pagination";

const STATUSES: { value: "" | ReadListStatus; label: string }[] = [
  { value: "", label: "All" },
  { value: "reading", label: "Reading" },
  { value: "completed", label: "Completed" },
  { value: "planning", label: "Planning" },
  { value: "paused", label: "Paused" },
  { value: "dropped", label: "Dropped" },
  { value: "repeating", label: "Repeating" },
];
const FORMATS = [
  { value: "", label: "All formats" },
  { value: "manga", label: "Manga" },
  { value: "manhwa", label: "Manhwa" },
  { value: "manhua", label: "Manhua" },
  { value: "novel", label: "Novel" },
  { value: "one_shot", label: "One-shot" },
  { value: "other", label: "Other" },
];

export default function ReadLibraryPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"" | ReadListStatus>("");
  const [format, setFormat] = useState("");
  const [q, setQ] = useState("");
  const [qDraft, setQDraft] = useState("");

  const library = useResource({
    id: ["read-library", page, status, format, q],
    load: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(MEDIA_HISTORY_PAGE_SIZE),
      });
      if (status) params.set("status", status);
      if (format) params.set("format", format);
      if (q) params.set("q", q);
      return readFetch<ReadLibraryPage>(`/library?${params}`);
    },
  });

  const totalPages = library.value
    ? Math.max(1, Math.ceil(library.value.total / library.value.pageSize))
    : 1;

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
            setStatus(e.target.value as "" | ReadListStatus);
            setPage(1);
          }}
          className="rounded border border-[var(--line)] bg-[var(--bg-1)] px-2 py-1.5 text-sm text-[var(--ink)]"
        >
          {STATUSES.map((s) => (
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
          {FORMATS.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(qDraft.trim());
            setPage(1);
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

      {library.empty && (
        <StateMessage variant="loading" />
      )}
      {!library.empty && (library.value?.items.length ?? 0) === 0 && (
        <EmptyState
          title="No titles yet"
          description="Connect AniList under Read → Sources to sync your manga list."
        />
      )}
      {library.value && library.value.items.length > 0 && (
        <>
          <ul className="space-y-3">
            {library.value.items.map((item) => (
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

          {library.value.total > library.value.pageSize && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                disabled={page <= 1 || library.refreshing}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5"
              >
                Previous
              </Button>
              <span className="font-mono text-xs text-[var(--muted)]">
                {page} / {totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={page >= totalPages || library.refreshing}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
