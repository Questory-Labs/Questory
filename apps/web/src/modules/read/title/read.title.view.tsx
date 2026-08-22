"use client";

import Link from "next/link";
import { EntityMetadataEdit } from "@/components/EntityMetadataEdit";
import { TagsEditor } from "@/components/TagsEditor";
import {
  PageHeader,
  ResourceStatus,
  SkeletonDetailHeader,
  StateMessage,
} from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/dates";
import { displayLabel } from "@/lib/display-label";
import type { ReadTitleViewProps } from "./read.title.types";

export const ReadTitleView = (props: Record<string, unknown>) => {
  const { id, detail, saveBusy, onSave } = props as ReadTitleViewProps;
  const t = detail.value?.title;
  const title = t ? displayLabel(t.displayName, t.name) : "Title";

  return (
    <>
      <PageHeader
        eyebrow={t?.format ?? "Title"}
        title={title}
        description={
          detail.value
            ? `${detail.value.eventCount} events · first ${formatDate(detail.value.firstReadAt)} · latest ${formatDate(detail.value.latestReadAt)}${detail.value.listStatus ? ` · ${detail.value.listStatus}` : ""}`
            : undefined
        }
        actions={
          t ? (
            <EntityMetadataEdit
              initialDisplayName={t.displayName}
              initialCoverUrl={t.coverUrl}
              canonicalName={t.name}
              coverLabel="Cover URL"
              saving={saveBusy}
              onSave={onSave}
            />
          ) : null
        }
      />

      <ResourceStatus
        failed={detail.failed}
        empty={detail.empty}
        loading={<SkeletonDetailHeader />}
        error={<StateMessage variant="error">Title not found.</StateMessage>}
      >
        {detail.value && t ? (
          <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
            {t.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={t.coverUrl}
                alt={title}
                className="h-72 w-48 object-cover"
              />
            ) : (
              <div className="h-72 w-48 bg-[var(--bg-1)]" />
            )}
            <div>
              {t.displayName && t.displayName !== t.name ? (
                <p className="text-sm text-[var(--muted)]">{t.name}</p>
              ) : null}
              {t.year ? (
                <p className="mt-1 text-sm text-[var(--muted)]">{t.year}</p>
              ) : null}
              {t.publishingStatus ? (
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                  {t.publishingStatus}
                </p>
              ) : null}
              {t.overview ? (
                <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
                  {t.overview}
                </p>
              ) : null}

              {t.genres.length > 0 ? (
                <p className="mt-4 text-sm text-[var(--muted)]">
                  {t.genres.join(" · ")}
                </p>
              ) : null}

              <section className="mt-8">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
                  History
                </h2>
                {detail.value.recentEvents.length > 0 ? (
                  <ul className="mt-3 divide-y divide-[var(--line)]">
                    {detail.value.recentEvents.map((e) => (
                      <li
                        key={e.id}
                        className="py-2 font-mono text-[12px] text-[var(--muted)]"
                      >
                        {formatDateTime(e.readAt)}
                        {e.chaptersRead != null ? ` · Ch. ${e.chaptersRead}` : ""}
                        {e.volumesRead != null ? ` · Vol. ${e.volumesRead}` : ""}
                        {e.status ? ` · ${e.status}` : ""}
                        {` · ${e.source}`}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    No events yet.
                  </p>
                )}
              </section>

              <section className="mt-8">
                <TagsEditor itemKey={`read_title:${id}`} />
              </section>

              <p className="mt-8 text-sm text-[var(--muted)]">
                <Link href="/read/library" className="hover:text-[var(--accent)]">
                  ← Back to library
                </Link>
              </p>
            </div>
          </div>
        ) : null}
      </ResourceStatus>
    </>
  );
};
