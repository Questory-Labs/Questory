"use client";

import Link from "next/link";
import { formatDateTime } from "@/lib/dates";
import { MediaHistoryView } from "@/modules/media/history/media.history.view";
import type { MediaHistoryPage } from "@/modules/media/history/media.history.types";
import { sourceLabel } from "@/modules/media/shelf/shelf.utils";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { ReadRecentEvent } from "@questorylabs/shared";
import { ReadShelfTabs } from "../library/components/ReadShelfTabs";
import { readStatusColor, readStatusLabel } from "../library/read.library.constants";
import { formatLabel } from "../library/read.library.utils";
import { readEventTitle } from "./read.history.utils";

type ReadHistoryViewProps = {
  recent: UseResourceResult<MediaHistoryPage<ReadRecentEvent>>;
  page: number;
  setPage: (page: number) => void;
};

export const ReadHistoryView = (props: Record<string, unknown>) => {
  const { recent, page, setPage } = props as ReadHistoryViewProps;

  return (
    <MediaHistoryView
      recent={recent}
      page={page}
      setPage={setPage}
      eyebrow="Read · History"
      title={
        <>
          Every chapter, <span className="font-serif text-[#c9d1f6]">newest first</span>
        </>
      }
      actions={<ReadShelfTabs active="history" />}
      listLabel="Reading history"
      emptyTitle="No reading events yet"
      emptyDescription="Connect AniList or another list under Sources to start syncing."
      errorMessage="Could not load read history."
      renderItem={(e) => {
        const color = readStatusColor(e.status);
        return (
          <li
            key={e.id}
            className="q-row relative flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-2xl py-3.5 pl-[18px] pr-4 hover:bg-white/[0.04]"
          >
            <span
              aria-hidden="true"
              className="h-[7px] w-[7px] rounded-full"
              style={{ background: color, boxShadow: `0 0 8px color-mix(in srgb, ${color} 60%, transparent)` }}
            />
            <span className="min-w-0 flex-[1_1_260px]">
              <Link href={`/read/titles/${e.title.id}`} className="block font-normal text-[var(--ink)] no-underline hover:text-white">
                {readEventTitle(e)}
              </Link>
              <span className="block font-mono text-[10px] text-[var(--muted)]">
                {[sourceLabel(e.source), formatLabel(e.title.format), e.status ? readStatusLabel(e.status) : null]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <span className="text-[13px] text-[var(--dim)]">{formatDateTime(e.readAt)}</span>
            <span className="min-w-14 text-right text-xl font-extralight">{e.progress > 0 ? `${e.progress}%` : ""}</span>
          </li>
        );
      }}
    />
  );
};
