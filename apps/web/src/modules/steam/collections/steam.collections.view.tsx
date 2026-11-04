"use client";

import {
  EmptyState,
  ResourceStatus,
  SkeletonTileGrid,
} from "@questorylabs/ui";
import { CollectionListRow } from "./components/CollectionListRow";
import { CollectionShelfCard } from "./components/CollectionShelfCard";
import { TasteGroupsPanel } from "./components/TasteGroupsPanel";
import type { CollectionsViewProps } from "./steam.collections.types";
import { splitCollections } from "./steam.collections.utils";

export const CollectionsView = (props: Record<string, unknown>) => {
  const {
    list,
    create,
    name,
    setName,
    tasteAvailable,
    groupByTaste,
    tastePreview,
    saveCluster,
  } = props as CollectionsViewProps;
  const grouped = groupByTaste?.value;
  const { shelves, custom } = splitCollections(list.value || []);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-[22px]">
      <header className="q-in flex flex-wrap items-end justify-between gap-4 px-1 pb-1 pt-2">
        <div>
          <p className="label-mono text-[var(--faint)]">
            Smart shelves fill themselves · custom lists are yours
          </p>
          <h1 className="font-display mt-1.5 text-[clamp(34px,4vw,52px)] font-light leading-none tracking-[-0.035em]">
            Collections,{" "}
            <em className="font-serif font-normal text-[var(--muted)]">sorted for you</em>
          </h1>
        </div>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create.submit();
          }}
        >
          {tasteAvailable && groupByTaste ? (
            <button
              type="button"
              disabled={groupByTaste.busy}
              onClick={() => groupByTaste.submit()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[rgba(230,194,122,0.3)] bg-[rgba(230,194,122,0.07)] px-[18px] text-sm text-[#f0d9a6] disabled:opacity-60"
            >
              <span aria-hidden="true" className="q-live h-[5px] w-[5px] rounded-full bg-[#e6c27a]" />
              {groupByTaste.busy ? "Grouping..." : "Group by taste"}
            </button>
          ) : null}
          <label className="flex min-h-11 items-center rounded-full border border-white/[0.08] bg-black/25 px-4">
            <span className="sr-only">Collection name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New custom collection"
              maxLength={120}
              className="w-[200px] max-w-full border-0 bg-transparent text-sm text-[var(--ink)] outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={create.busy}
            className="min-h-11 rounded-full bg-[var(--ink)] px-[18px] text-sm font-medium text-[#0a0a0b] shadow-[0_8px_24px_-10px_rgba(255,255,255,0.4)] disabled:opacity-60"
          >
            Create
          </button>
        </form>
      </header>

      {groupByTaste?.failed ? (
        <p className="text-sm text-[var(--danger)]">Could not group your library right now.</p>
      ) : grouped ? (
        <p className="text-sm text-[var(--muted)]">
          {grouped.available
            ? `${grouped.collections} taste shelves updated.`
            : "Taste grouping is warming up. Try again later."}
        </p>
      ) : null}
      {create.failed ? (
        <p className="text-sm text-[var(--danger)]">Could not create collection.</p>
      ) : null}

      <ResourceStatus
        failed={list.failed}
        empty={list.empty}
        loading={<SkeletonTileGrid count={6} />}
        error={
          <EmptyState
            title={<span className="text-[var(--danger)]">Could not load collections.</span>}
          />
        }
      >
        {shelves.length || custom.length ? (
          <>
            {shelves.length ? (
              <section aria-labelledby="smart-shelves">
                <h2 id="smart-shelves" className="label-mono mx-1 text-[var(--faint)]">
                  Smart shelves
                </h2>
                <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5">
                  {shelves.map((c, i) => (
                    <CollectionShelfCard key={c.id} collection={c} index={i} />
                  ))}
                </div>
              </section>
            ) : null}
            <section
              aria-labelledby="custom-lists"
              className="panel q-in px-2 pb-2 pt-[18px]"
              style={{ ["--i" as string]: 8 }}
            >
              <h2 id="custom-lists" className="px-3.5 pb-1.5 text-[26px] font-light tracking-[-0.02em]">
                Your <em className="font-serif font-normal text-[var(--muted)]">lists</em>
              </h2>
              {custom.length ? (
                <ul>
                  {custom.map((c) => (
                    <CollectionListRow key={c.id} collection={c} />
                  ))}
                </ul>
              ) : (
                <p className="px-3.5 pb-3 text-[13px] text-[var(--muted)]">
                  No custom lists yet. Name one above to start.
                </p>
              )}
            </section>
          </>
        ) : (
          <EmptyState title="No collections yet." />
        )}
      </ResourceStatus>

      {tasteAvailable && tastePreview && saveCluster ? (
        <ResourceStatus
          failed={tastePreview.failed}
          empty={tastePreview.empty}
          loading={<SkeletonTileGrid count={2} />}
          error={
            <EmptyState
              title={<span className="text-[var(--danger)]">Could not load taste groups.</span>}
            />
          }
        >
          {tastePreview.value ? (
            <TasteGroupsPanel
              preview={tastePreview.value}
              saving={saveCluster.busy ? (saveCluster.input ?? null) : null}
              failed={saveCluster.failed}
              onSave={(id) => saveCluster.submit(id)}
            />
          ) : null}
        </ResourceStatus>
      ) : null}
    </div>
  );
};
