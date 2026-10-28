"use client";

import Link from "next/link";
import { EntityMetadataEdit } from "@/components/EntityMetadataEdit";
import { TagsEditor } from "@/components/TagsEditor";
import { Panel, ResourceStatus, SkeletonDetailHeader, StateMessage } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { displayLabel } from "@/lib/display-label";
import { readStatusLabel } from "../library/read.library.constants";
import { ReadTitleHero } from "./components/ReadTitleHero";
import { ReadTitleHistory } from "./components/ReadTitleHistory";
import type { ReadTitleViewProps } from "./read.title.types";

export const ReadTitleView = (props: Record<string, unknown>) => {
  const { id, detail, weeks, saveBusy, onSave, logBusy, logMessage, onLogChapter } = props as ReadTitleViewProps;
  const d = detail.value;
  const t = d?.title;

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <nav aria-label="Breadcrumb" className="label-mono text-[11px] text-[var(--faint)]">
          <Link href="/read/library" className="text-[var(--dim)] no-underline hover:text-[var(--ink)]">
            ← Back to library
          </Link>
          {t ? (
            <>
              {" "}
              <span aria-hidden="true">/</span> {displayLabel(t.displayName, t.name)}
            </>
          ) : null}
        </nav>
        {t ? (
          <EntityMetadataEdit
            initialDisplayName={t.displayName}
            initialCoverUrl={t.coverUrl}
            canonicalName={t.name}
            coverLabel="Cover URL"
            saving={saveBusy}
            onSave={onSave}
          />
        ) : null}
      </div>

      <ResourceStatus
        failed={detail.failed}
        empty={detail.empty}
        loading={<SkeletonDetailHeader />}
        error={<StateMessage variant="error">Title not found.</StateMessage>}
      >
        {d && t ? (
          <>
            <ReadTitleHero d={d} logBusy={logBusy} logMessage={logMessage} onLogChapter={onLogChapter} />
            <ReadTitleHistory d={d} weeks={weeks} />
            <p className="m-0 px-1 font-mono text-xs text-[var(--muted)]">
              {d.eventCount} events · first {formatDate(d.firstReadAt)} · latest {formatDate(d.latestReadAt)}
              {d.listStatus ? ` · ${readStatusLabel(d.listStatus)}` : ""}
            </p>
            <Panel className="q-in p-5 [--i:3]">
              <TagsEditor itemKey={`read_title:${id}`} />
            </Panel>
          </>
        ) : null}
      </ResourceStatus>
    </div>
  );
};
