"use client";

import Link from "next/link";
import { GameTile } from "@/components/GameTile";
import {
  Button,
  EmptyState,
  ResourceStatus,
  SkeletonTileGrid,
} from "@questorylabs/ui";
import { GAME_GRID_PAGE_SIZE } from "@/lib/pagination";
import { COLLECTION_KIND_LABELS } from "../collections/steam.collections.constants";
import { collectionKind } from "../collections/steam.collections.utils";
import { CollectionDeleteDialog } from "./components/CollectionDeleteDialog";
import { CollectionEditDialog } from "./components/CollectionEditDialog";
import type { CollectionDetailViewProps } from "./steam.collection-detail.types";

const pill =
  "min-h-9 rounded-full border border-white/[0.12] bg-white/[0.03] px-3.5 text-[13px] transition-colors hover:border-white/25";

export const CollectionDetailView = (props: Record<string, unknown>) => {
  const {
    collection,
    page,
    setPage,
    update,
    remove,
    editOpen = false,
    setEditOpen,
    deleteOpen = false,
    setDeleteOpen,
  } = props as CollectionDetailViewProps;
  const c = collection.value;
  const total = c?.total ?? 0;
  const pageSize = c?.pageSize ?? GAME_GRID_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const games = c?.games || [];
  const kind = c
    ? collectionKind({
        type: c.type === "custom" ? "custom" : "auto",
        ruleKey: c.ruleKey ?? null,
      })
    : null;
  const editable = kind === "custom" && update && remove && setEditOpen && setDeleteOpen;

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-4">
      <Link
        href="/collections"
        className="q-in inline-flex min-h-9 items-center gap-2 self-start text-[13px] text-[var(--muted)] hover:text-[var(--ink)]"
      >
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Collections
      </Link>
      <header className="q-in flex flex-wrap items-end justify-between gap-4 px-1 pb-1">
        <div>
          {kind ? (
            <p className="label-mono flex items-center gap-2 text-[var(--faint)]">
              {c?.color ? (
                <span
                  aria-hidden="true"
                  className="h-[7px] w-[7px] rounded-full"
                  style={{ background: c.color, boxShadow: `0 0 10px ${c.color}` }}
                />
              ) : null}
              {COLLECTION_KIND_LABELS[kind]}
            </p>
          ) : null}
          <h1 className="font-display mt-1.5 text-[clamp(34px,4vw,52px)] font-light leading-none tracking-[-0.035em]">
            {c?.name || "Collection"}
          </h1>
          {c ? (
            <p className="mt-2 text-sm text-[var(--muted)]">
              {c.total} games{c.description ? ` · ${c.description}` : ""}
            </p>
          ) : null}
        </div>
        {editable ? (
          <div className="flex gap-2">
            <button type="button" className={pill} onClick={() => setEditOpen(true)}>
              Edit
            </button>
            <button
              type="button"
              className={`${pill} text-[var(--danger)]`}
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </button>
          </div>
        ) : null}
      </header>

      <ResourceStatus
        failed={collection.failed}
        empty={collection.empty}
        loading={<SkeletonTileGrid count={8} />}
        error={
          <EmptyState
            title={<span className="text-[var(--danger)]">Could not load collection.</span>}
          />
        }
      >
        {games.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {games.map((g, i) => (
              <Link key={g.appId} href={`/library/${g.appId}`}>
                <GameTile
                  name={g.name}
                  headerImage={g.headerImage}
                  meta={g.genres.slice(0, 2).join(", ")}
                  index={i}
                />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="No games in this collection." />
        )}
      </ResourceStatus>

      {total > pageSize && (
        <div className="mt-2 flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            disabled={page <= 1}
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
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5"
          >
            Next
          </Button>
        </div>
      )}

      {editable && c ? (
        <>
          {editOpen ? (
            <CollectionEditDialog
              open
              initial={c}
              busy={update.busy}
              failed={update.failed}
              onClose={() => setEditOpen(false)}
              onSave={(input) => update.submit(input)}
            />
          ) : null}
          <CollectionDeleteDialog
            open={deleteOpen}
            name={c.name}
            busy={remove.busy}
            failed={remove.failed}
            onClose={() => setDeleteOpen(false)}
            onConfirm={() => remove.submit()}
          />
        </>
      ) : null}
    </div>
  );
};
