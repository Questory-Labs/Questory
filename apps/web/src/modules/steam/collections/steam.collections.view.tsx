"use client";

import Link from "next/link";
import {
  Button,
  EmptyState,
  PageHeader,
  Panel,
  ResourceStatus,
  SkeletonTileGrid,
} from "@questorylabs/ui";
import type { CollectionsViewProps } from "./steam.collections.types";

export const CollectionsView = (props: Record<string, unknown>) => {
  const { list, create, name, setName } = props as CollectionsViewProps;

  return (
    <>
      <PageHeader
        title="Collections"
        description="Smart shelves plus your custom lists"
      />

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) create.submit();
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New custom collection"
          className="rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 text-sm"
        />
        <Button type="submit" variant="primary" disabled={create.busy}>
          Create
        </Button>
      </form>
      {create.failed ? (
        <p className="mt-2 text-sm text-[var(--danger)]">
          Could not create collection.
        </p>
      ) : null}

      <div className="mt-8">
        <ResourceStatus
          failed={list.failed}
          empty={list.empty}
          loading={<SkeletonTileGrid count={6} />}
          error={
            <EmptyState
              title={
                <span className="text-[var(--danger)]">
                  Could not load collections.
                </span>
              }
            />
          }
        >
          {(list.value || []).length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(list.value || []).map((c) => (
                <Link key={c.id} href={`/collections/${c.id}`}>
                  <Panel className="p-5 transition hover:border-[var(--accent)]">
                    <div className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                      {c.type}
                    </div>
                    <div className="mt-2 font-display text-xl font-bold">
                      {c.name}
                    </div>
                    <div className="mt-1 text-sm text-[var(--muted)]">
                      {c.gameCount} games
                      {c.description ? ` · ${c.description}` : ""}
                    </div>
                  </Panel>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No collections yet." />
          )}
        </ResourceStatus>
      </div>
    </>
  );
};
